import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import QRCode from 'qrcode';
const otplib = require('otplib');
import { censoDb, urnaDb } from '../config/supabase';

// Instancia y configuración de compatibilidad de otplib
const authenticator = otplib.authenticator || otplib;

if (authenticator.options) {
    authenticator.options = {
        ...authenticator.options,
        guardrails: false,
    };
}

export const loginPaso1 = async (req: Request, res: Response): Promise<void> => {
    try {
        const { documentoIdentidad, password } = req.body;
        console.log('\n--- INTENTO DE LOGIN (PASO 1) ---');
        console.log('Documento recibido:', documentoIdentidad);

        if (!documentoIdentidad || !password) {
            res.status(400).json({ success: false, error: 'Documento y contraseña requeridos' });
            return;
        }

        const docLimpio = String(documentoIdentidad).trim();

        // 1. Buscar votante en el censo
        const { data: votante, error } = await censoDb
            .from('votantes')
            .select('id_votante, documento_identidad, correo_institucional, password_hash, mfa_secret, esta_habilitado, ha_solicitado_token')
            .eq('documento_identidad', docLimpio)
            .maybeSingle();

        if (error || !votante) {
            res.status(401).json({ success: false, error: 'Credenciales inválidas' });
            return;
        }

        // 2. Validar habilitación
        if (!votante.esta_habilitado) {
            res.status(403).json({ success: false, error: 'El votante no está habilitado en el censo actual' });
            return;
        }

        if (votante.ha_solicitado_token) {
            res.status(403).json({ success: false, error: 'Ya has emitido tu papeleta electoral previamente' });
            return;
        }

        // 3. Validar contraseña con bcrypt
        const passwordValida = await bcrypt.compare(password, votante.password_hash);
        if (!passwordValida) {
            res.status(401).json({ success: false, error: 'Credenciales inválidas' });
            return;
        }

        // 4. Asegurar que exista un mfa_secret
        let secretMFA = votante.mfa_secret;
        if (!secretMFA) {
            secretMFA = authenticator.generateSecret();
            await censoDb
                .from('votantes')
                .update({ mfa_secret: secretMFA, is_mfa_enabled: true })
                .eq('id_votante', votante.id_votante);
        }

        // 5. Generar token temporal de desafío (JWT)
        const challengeToken = jwt.sign(
            { votanteId: votante.id_votante },
            process.env.JWT_CHALLENGE_SECRET || 'secret_fallback',
            { expiresIn: '5m' }
        );

        // 6. Generar código QR en Base64
        const accountLabel = votante.correo_institucional || docLimpio;
        const otpAuthUri = `otpauth://totp/EleccionesSindicales:${accountLabel}?secret=${secretMFA}&issuer=EleccionesSindicales`;
        const qrCodeUrl = await QRCode.toDataURL(otpAuthUri);

        res.json({
            success: true,
            challengeToken,
            qrCode: qrCodeUrl,
            manualKey: secretMFA,
        });
    } catch (error: any) {
        console.error('Error interno en loginPaso1:', error);
        res.status(500).json({ success: false, error: error.message || 'Error interno del servidor' });
    }
};

export const loginPaso2Mfa = async (req: Request, res: Response): Promise<void> => {
    try {
        const { challengeToken, codigoMfa } = req.body;
        console.log('\n--- VERIFICACIÓN MFA (PASO 2) ---');

        if (!challengeToken || !codigoMfa) {
            res.status(400).json({ success: false, error: 'Desafío y código 2FA requeridos' });
            return;
        }

        // 1. Verificar challengeToken
        let decoded: any;
        try {
            decoded = jwt.verify(challengeToken, process.env.JWT_CHALLENGE_SECRET || 'secret_fallback');
        } catch {
            res.status(401).json({ success: false, error: 'La sesión de autenticación ha expirado' });
            return;
        }

        const { votanteId } = decoded;

        // 2. Obtener datos actualizados del votante
        const { data: votante, error: errorVotante } = await censoDb
            .from('votantes')
            .select('id_votante, mfa_secret, ha_solicitado_token, esta_habilitado')
            .eq('id_votante', votanteId)
            .single();

        if (errorVotante || !votante || !votante.esta_habilitado || votante.ha_solicitado_token) {
            res.status(403).json({ success: false, error: 'Votante inhabilitado o papeleta ya emitida' });
            return;
        }

        // 3. Validar código TOTP
        const codigoLimpio = String(codigoMfa).trim();
        let isValidMfa = false;

        if (votante.mfa_secret) {
            try {
                if (typeof authenticator.verify === 'function') {
                    isValidMfa = authenticator.verify({
                        token: codigoLimpio,
                        secret: votante.mfa_secret,
                    });
                } else if (typeof authenticator.check === 'function') {
                    isValidMfa = authenticator.check(codigoLimpio, votante.mfa_secret);
                }
            } catch (errOtp) {
                console.error('Error durante validación TOTP:', errOtp);
                isValidMfa = false;
            }
        }

        if (!isValidMfa) {
            res.status(401).json({ success: false, error: 'Código 2FA incorrecto o expirado' });
            return;
        }

        // 4. Buscar elección ABIERTA en la urna
        const { data: eleccion, error: errorEleccion } = await urnaDb
            .from('elecciones')
            .select('id_eleccion')
            .eq('estado', 'ABIERTA')
            .limit(1)
            .maybeSingle();

        if (errorEleccion || !eleccion) {
            res.status(400).json({ success: false, error: 'No hay ninguna jornada electoral abierta' });
            return;
        }

        // 5. Generar y registrar token ciego en la URNA
        const tokenPlano = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(tokenPlano).digest('hex');

        const { error: errorTokenUrna } = await urnaDb
            .from('tokens_votacion')
            .insert({
                id_eleccion: eleccion.id_eleccion,
                token_hash: tokenHash,
                estado: 'DISPONIBLE',
            });

        if (errorTokenUrna) {
            throw new Error('Error al registrar el token ciego en la urna');
        }

        // 6. Marcar solicitud en el CENSO
        const { error: errorUpdateCenso } = await censoDb
            .from('votantes')
            .update({
                ha_solicitado_token: true,
                token_emitido_at: new Date().toISOString(),
            })
            .eq('id_votante', votanteId);

        if (errorUpdateCenso) {
            throw new Error('Error al actualizar el estado en el censo');
        }

        res.json({
            success: true,
            tokenVotacion: tokenPlano,
            eleccionId: eleccion.id_eleccion,
        });
    } catch (error: any) {
        console.error('Error interno en loginPaso2Mfa:', error);
        res.status(500).json({ success: false, error: error.message || 'Error en el proceso de emisión' });
    }
};

export const verificarVotante = async (req: Request, res: Response): Promise<void> => {
    try {
        const { documento } = req.params;

        if (!documento || typeof documento !== 'string') {
            res.status(400).json({ success: false, error: 'Documento de identidad requerido y debe ser texto.' });
            return;
        }

        const { data: votante, error } = await censoDb
            .from('votantes')
            .select('id_votante, documento_identidad, nombres, apellidos, esta_habilitado, ha_solicitado_token')
            .eq('documento_identidad', documento.trim())
            .single();

        if (error || !votante) {
            res.status(404).json({ success: false, error: 'Votante no encontrado en el censo electoral.' });
            return;
        }

        res.json({
            success: true,
            votante: {
                documento: votante.documento_identidad,
                nombres: votante.nombres,
                apellidos: votante.apellidos,
                habilitado: votante.esta_habilitado,
                haVotado: votante.ha_solicitado_token,
            },
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message || 'Error al verificar votante.' });
    }
};

export const obtenerSetupMfa = async (req: Request, res: Response): Promise<void> => {
    try {
        const { documento } = req.body;

        const { data: votante, error } = await censoDb
            .from('votantes')
            .select('id_votante, correo_institucional, mfa_secret')
            .eq('documento_identidad', String(documento).trim())
            .single();

        if (error || !votante || !votante.mfa_secret) {
            res.status(404).json({ success: false, error: 'Votante o secreto 2FA no encontrado.' });
            return;
        }

        const otpAuthUri = `otpauth://totp/EleccionesSindicales:${votante.correo_institucional}?secret=${votante.mfa_secret}&issuer=EleccionesSindicales`;
        const qrDataUrl = await QRCode.toDataURL(otpAuthUri);

        res.json({
            success: true,
            qrCode: qrDataUrl,
            manualKey: votante.mfa_secret,
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
};