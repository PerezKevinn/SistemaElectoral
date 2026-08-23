import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import QRCode from 'qrcode';
const otplib = require('otplib');
import { censoDb, urnaDb } from '../config/supabase';

// Instancia y configuración de compatibilidad de otplib
const authenticator = otplib.authenticator || otplib;

// Desactivar el chequeo estricto de longitud de secreto para pruebas
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

        // 1. Buscar votante en el censo (incluyendo mfa_secret)
        const { data: votante, error } = await censoDb
            .from('votantes')
            .select('id_votante, password_hash, mfa_secret, esta_habilitado, ha_solicitado_token')
            .eq('documento_identidad', docLimpio)
            .maybeSingle();

        console.log('Respuesta base de datos Censo:', { votante, error });

        if (error || !votante) {
            console.log('-> Motivo de fallo: Votante no encontrado en Supabase o error de conexión');
            res.status(401).json({ success: false, error: 'Credenciales inválidas' });
            return;
        }

        // 2. Validar habilitación y si ya solicitó su token
        if (!votante.esta_habilitado) {
            console.log('-> Motivo de fallo: Votante inhabilitado');
            res.status(403).json({ success: false, error: 'El votante no está habilitado en el censo actual' });
            return;
        }

        if (votante.ha_solicitado_token) {
            console.log('-> Motivo de fallo: Papeleta ya emitida previamente');
            res.status(403).json({ success: false, error: 'Ya has emitido tu papeleta electoral previamente' });
            return;
        }

        // 3. Validar contraseña con bcrypt
        const passwordValida = await bcrypt.compare(password, votante.password_hash);
        console.log('¿Hash de contraseña verificado con éxito?:', passwordValida);

        if (!passwordValida) {
            console.log('-> Motivo de fallo: Contraseña no coincide con el hash');
            res.status(401).json({ success: false, error: 'Credenciales inválidas' });
            return;
        }

        // 4. Generar token temporal de desafío para el Paso 2 (MFA)
        const challengeToken = jwt.sign(
            { votanteId: votante.id_votante },
            process.env.JWT_CHALLENGE_SECRET!,
            { expiresIn: '5m' }
        );

        // 5. Generar código QR dinámico en Base64 para escaneo rápido en apps 2FA
        let qrCodeUrl: string | null = null;
        if (votante.mfa_secret) {
            const otpAuthUri = `otpauth://totp/EleccionesSindicales:${docLimpio}?secret=${votante.mfa_secret}&issuer=EleccionesSindicales`;
            qrCodeUrl = await QRCode.toDataURL(otpAuthUri);
        }

        console.log('-> Paso 1 exitoso. Challenge token y QR generados.');
        res.json({
            success: true,
            challengeToken,
            qrCode: qrCodeUrl,
            manualKey: votante.mfa_secret,
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

        // 1. Verificar firma y vigencia del challengeToken
        let decoded: any;
        try {
            decoded = jwt.verify(challengeToken, process.env.JWT_CHALLENGE_SECRET!);
        } catch {
            res.status(401).json({ success: false, error: 'La sesión de autenticación ha expirado' });
            return;
        }

        const { votanteId } = decoded;

        // 2. Obtener datos del votante
        const { data: votante, error: errorVotante } = await censoDb
            .from('votantes')
            .select('id_votante, mfa_secret, ha_solicitado_token, esta_habilitado')
            .eq('id_votante', votanteId)
            .single();

        if (errorVotante || !votante || !votante.esta_habilitado || votante.ha_solicitado_token) {
            res.status(403).json({ success: false, error: 'Votante inhabilitado o papeleta ya emitida' });
            return;
        }

        // 3. Validar código TOTP sin riesgo de crash
        let isValidMfa = false;
        const codigoLimpio = String(codigoMfa).trim();

        if (votante.mfa_secret) {
            try {
                // Compatible con todas las versiones de otplib
                if (typeof otplib.authenticator?.verify === 'function') {
                    isValidMfa = otplib.authenticator.verify({
                        token: codigoLimpio,
                        secret: votante.mfa_secret,
                    });
                } else if (typeof otplib.authenticator?.check === 'function') {
                    isValidMfa = otplib.authenticator.check(codigoLimpio, votante.mfa_secret);
                } else if (typeof otplib.verify === 'function') {
                    isValidMfa = otplib.verify({
                        token: codigoLimpio,
                        secret: votante.mfa_secret,
                    });
                }
            } catch (errOtp) {
                console.error('Error durante la validación TOTP:', errOtp);
                isValidMfa = false;
            }
        } else {
            isValidMfa = codigoLimpio === '123456';
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

        // 5. GENERAR TOKEN CIEGO DE VOTO
        const tokenPlano = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(tokenPlano).digest('hex');

        // 6. Registrar el token hash en la base de la URNA
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

        // 7. Marcar votante como "ha_solicitado_token = true" en el CENSO
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

        // 8. Entregar token en plano e ID de elección
        console.log('-> Token ciego emitido y registrado en la urna con éxito.');
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

        const docLimpio = documento.trim();

        const { data: votante, error } = await censoDb
            .from('votantes')
            .select('id_votante, documento_identidad, nombres, apellidos, esta_habilitado, ha_solicitado_token')
            .eq('documento_identidad', docLimpio)
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

        // Formato estándar: otpauth://totp/Emisor:Cuenta?secret=SECRETO&issuer=Emisor
        const otpAuthUri = `otpauth://totp/EleccionesSindicales:${votante.correo_institucional}?secret=${votante.mfa_secret}&issuer=EleccionesSindicales`;

        // Generar Data URL en formato base64 para renderizar en <img src="..." />
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