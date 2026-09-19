import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import QRCode from 'qrcode';
const otplib = require('otplib');
import { censoDb, urnaDb } from '../config/supabase';
import { validarDocumento, validarPasswordFuerte } from '../middleware/security';

// Instancia y configuración de compatibilidad de otplib
const authenticator = otplib.authenticator || otplib;

if (authenticator.options) {
    authenticator.options = {
        ...authenticator.options,
        window: 1, // Permite 1 paso de tolerancia por desfase de reloj
    };
}

const getJwtSecret = (): string => {
    const secret = process.env.JWT_CHALLENGE_SECRET || process.env.JWT_SECRET;
    if (!secret || secret.length < 16) {
        throw new Error('Configuración de seguridad insuficiente: Se requiere JWT_CHALLENGE_SECRET robusto.');
    }
    return secret;
};

// 1. Login de Votantes (Paso 1: Documento + Contraseña)
export const loginPaso1 = async (req: Request, res: Response): Promise<void> => {
    try {
        const { documentoIdentidad, password } = req.body;

        if (!documentoIdentidad || !password) {
            res.status(400).json({ success: false, error: 'Documento y contraseña requeridos.' });
            return;
        }

        const docLimpio = validarDocumento(documentoIdentidad);

        // 1. Buscar votante en el censo oficial
        const { data: votante, error } = await censoDb
            .from('votantes')
            .select('id_votante, documento_identidad, nombres, apellidos, correo_institucional, password_hash, mfa_secret, is_mfa_enabled, esta_habilitado, ha_solicitado_token')
            .eq('documento_identidad', docLimpio)
            .maybeSingle();

        if (error || !votante) {
            res.status(401).json({ success: false, error: 'Credenciales inválidas o votante no registrado.' });
            return;
        }

        // 2. Validar habilitación estatutaria
        if (!votante.esta_habilitado) {
            res.status(403).json({ success: false, error: 'El elector no se encuentra habilitado en el censo electoral activo.' });
            return;
        }

        if (votante.ha_solicitado_token) {
            res.status(403).json({ success: false, error: 'Tu derecho al voto ya ha sido ejercido previamente en esta jornada.' });
            return;
        }

        // 3. Validar contraseña con bcrypt (resistente a timing attacks)
        const passwordValida = await bcrypt.compare(String(password), votante.password_hash);
        if (!passwordValida) {
            res.status(401).json({ success: false, error: 'Credenciales inválidas o votante no registrado.' });
            return;
        }

        // 4. Si el votante tiene contraseña temporal (no ha completado configuración inicial), exigir cambio obligatorio
        if (!votante.is_mfa_enabled) {
            const resetPasswordToken = jwt.sign(
                {
                    votanteId: votante.id_votante,
                    doc: votante.documento_identidad,
                    type: 'FORCE_PASSWORD_CHANGE',
                    nonce: crypto.randomBytes(16).toString('hex'),
                },
                getJwtSecret(),
                { expiresIn: '15m', algorithm: 'HS256' }
            );

            res.json({
                success: true,
                requiereCambioPassword: true,
                resetPasswordToken,
                nombreVotante: `${votante.nombres || ''} ${votante.apellidos || ''}`.trim() || 'Votante',
            });
            return;
        }

        // 5. Asegurar que exista un secreto MFA
        let secretMFA = votante.mfa_secret;
        if (!secretMFA) {
            secretMFA = authenticator.generateSecret();
            await censoDb
                .from('votantes')
                .update({ mfa_secret: secretMFA, is_mfa_enabled: true })
                .eq('id_votante', votante.id_votante);
        }

        // 6. Generar token temporal de desafío (JWT firmado con HS256)
        const challengeToken = jwt.sign(
            {
                votanteId: votante.id_votante,
                doc: votante.documento_identidad,
                type: 'MFA_CHALLENGE',
                nonce: crypto.randomBytes(16).toString('hex'),
            },
            getJwtSecret(),
            { expiresIn: '5m', algorithm: 'HS256' }
        );

        // 7. Generar código QR en Base64 para la app autenticadora
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
        console.error('⚠️ [SEGURIDAD] Error en loginPaso1:', error.message);
        res.status(error.message?.includes('formato') ? 400 : 500).json({
            success: false,
            error: error.message?.includes('formato') ? error.message : 'Error en la verificación de credenciales.',
        });
    }
};

/**
 * 1.5. Establecer contraseña definitiva en primer login (Obligatorio para contraseñas temporales)
 */
export const cambiarPasswordInicial = async (req: Request, res: Response): Promise<void> => {
    try {
        const { resetPasswordToken, nuevaPassword, confirmarPassword } = req.body;

        if (!resetPasswordToken || !nuevaPassword) {
            res.status(400).json({ success: false, error: 'Token de seguridad y nueva contraseña requeridos.' });
            return;
        }

        if (confirmarPassword && nuevaPassword !== confirmarPassword) {
            res.status(400).json({ success: false, error: 'Las contraseñas ingresadas no coinciden.' });
            return;
        }

        const passLimpia = validarPasswordFuerte(nuevaPassword);

        // 1. Verificar token firmado
        let decoded: any;
        try {
            decoded = jwt.verify(resetPasswordToken, getJwtSecret(), { algorithms: ['HS256'] });
        } catch {
            res.status(401).json({ success: false, error: 'El tiempo para actualizar la contraseña ha expirado. Inicia sesión nuevamente.' });
            return;
        }

        if (decoded.type !== 'FORCE_PASSWORD_CHANGE' || !decoded.votanteId) {
            res.status(403).json({ success: false, error: 'Token de cambio de contraseña inválido.' });
            return;
        }

        // 2. Buscar votante
        const { data: votante, error } = await censoDb
            .from('votantes')
            .select('id_votante, documento_identidad, correo_institucional, password_hash, esta_habilitado, ha_solicitado_token')
            .eq('id_votante', decoded.votanteId)
            .maybeSingle();

        if (error || !votante) {
            res.status(404).json({ success: false, error: 'Votante no encontrado en el censo.' });
            return;
        }

        if (!votante.esta_habilitado) {
            res.status(403).json({ success: false, error: 'El elector no se encuentra habilitado.' });
            return;
        }

        if (votante.ha_solicitado_token) {
            res.status(403).json({ success: false, error: 'Tu derecho al voto ya ha sido ejercido previamente.' });
            return;
        }

        // 3. Hashear nueva contraseña personal con bcrypt
        const password_hash = await bcrypt.hash(passLimpia, 10);

        // 4. Generar secreto MFA para el elector
        const secretMFA = authenticator.generateSecret();

        // 5. Actualizar en BD (marcando is_mfa_enabled = true)
        const { error: updateErr } = await censoDb
            .from('votantes')
            .update({
                password_hash,
                mfa_secret: secretMFA,
                is_mfa_enabled: true,
            })
            .eq('id_votante', votante.id_votante);

        if (updateErr) throw updateErr;

        // 6. Generar token de desafío MFA para el siguiente paso
        const challengeToken = jwt.sign(
            {
                votanteId: votante.id_votante,
                doc: votante.documento_identidad,
                type: 'MFA_CHALLENGE',
                nonce: crypto.randomBytes(16).toString('hex'),
            },
            getJwtSecret(),
            { expiresIn: '5m', algorithm: 'HS256' }
        );

        const accountLabel = votante.correo_institucional || votante.documento_identidad;
        const otpAuthUri = `otpauth://totp/EleccionesSindicales:${accountLabel}?secret=${secretMFA}&issuer=EleccionesSindicales`;
        const qrCodeUrl = await QRCode.toDataURL(otpAuthUri);

        res.json({
            success: true,
            mensaje: 'Contraseña personal configurada con éxito.',
            challengeToken,
            qrCode: qrCodeUrl,
            manualKey: secretMFA,
        });
    } catch (err: any) {
        console.error('Error en cambiarPasswordInicial:', err.message);
        res.status(err.message?.includes('formato') || err.message?.includes('caracteres') ? 400 : 500).json({
            success: false,
            error: err.message || 'Error al actualizar la contraseña.',
        });
    }
};

// 2. Verificación MFA y Emisión Atómica de Token Ciego (Paso 2)
export const loginPaso2Mfa = async (req: Request, res: Response): Promise<void> => {
    let tokenRegistradoEnUrna: string | null = null;
    let eleccionActivaId: string | null = null;

    try {
        const { challengeToken, codigoMfa } = req.body;

        if (!challengeToken || !codigoMfa) {
            res.status(400).json({ success: false, error: 'Token de desafío y código 2FA requeridos.' });
            return;
        }

        // 1. Verificar firma y expiración del challengeToken
        let decoded: any;
        try {
            decoded = jwt.verify(challengeToken, getJwtSecret(), { algorithms: ['HS256'] });
        } catch {
            res.status(401).json({ success: false, error: 'El desafío de seguridad ha expirado. Inicie sesión nuevamente.' });
            return;
        }

        if (decoded.type !== 'MFA_CHALLENGE' || !decoded.votanteId) {
            res.status(401).json({ success: false, error: 'Token de desafío inválido o alterado.' });
            return;
        }

        const { votanteId } = decoded;

        // 2. Obtener datos vigentes del votante
        const { data: votante, error: errorVotante } = await censoDb
            .from('votantes')
            .select('id_votante, mfa_secret, ha_solicitado_token, esta_habilitado')
            .eq('id_votante', votanteId)
            .single();

        if (errorVotante || !votante || !votante.esta_habilitado || votante.ha_solicitado_token) {
            res.status(403).json({ success: false, error: 'El elector está inhabilitado o ya ha emitido su voto previamente.' });
            return;
        }

        // 3. Validar código TOTP de 6 dígitos
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
            res.status(401).json({ success: false, error: 'Código 2FA incorrecto o expirado.' });
            return;
        }

        // 4. Verificar que exista una elección ABIERTA en la urna digital
        const { data: eleccion, error: errorEleccion } = await urnaDb
            .from('elecciones')
            .select('id_eleccion')
            .eq('estado', 'ABIERTA')
            .limit(1)
            .maybeSingle();

        if (errorEleccion || !eleccion) {
            res.status(400).json({ success: false, error: 'No hay ninguna jornada electoral abierta para recibir sufragios.' });
            return;
        }

        eleccionActivaId = eleccion.id_eleccion;

        // 5. BLINDAJE ANTI-RACE CONDITION (Condición atómica en el Censo)
        // Solo se actualiza si ha_solicitado_token sigue siendo FALSE
        const { data: censoActualizado, error: errorUpdateCenso } = await censoDb
            .from('votantes')
            .update({
                ha_solicitado_token: true,
                token_emitido_at: new Date().toISOString(),
            })
            .eq('id_votante', votanteId)
            .eq('ha_solicitado_token', false)
            .select('id_votante');

        if (errorUpdateCenso || !censoActualizado || censoActualizado.length === 0) {
            res.status(403).json({
                success: false,
                error: 'Acción bloqueada: Ya se ha procesado una emisión de papeleta para este elector.',
            });
            return;
        }

        // 6. Generar token ciego criptográficamente seguro (32 bytes aleatorios = 256 bits)
        const tokenPlano = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(tokenPlano).digest('hex');
        tokenRegistradoEnUrna = tokenHash;

        // 7. Registrar token ciego en la URNA DIGITAL (Desacoplado de la identidad)
        const { error: errorTokenUrna } = await urnaDb
            .from('tokens_votacion')
            .insert({
                id_eleccion: eleccion.id_eleccion,
                token_hash: tokenHash,
                estado: 'DISPONIBLE',
            });

        if (errorTokenUrna) {
            // Revertir el flag en el censo para no dejar al votante bloqueado si falla la base de datos de la urna
            await censoDb
                .from('votantes')
                .update({ ha_solicitado_token: false, token_emitido_at: null })
                .eq('id_votante', votanteId);

            throw new Error('Error al registrar el token ciego en la urna digital.');
        }

        res.json({
            success: true,
            tokenVotacion: tokenPlano,
            eleccionId: eleccion.id_eleccion,
        });
    } catch (error: any) {
        console.error('⚠️ [SEGURIDAD] Error en loginPaso2Mfa:', error.message);
        res.status(500).json({ success: false, error: 'Error durante la emisión del token seguro.' });
    }
};

// 3. Verificación de Votante en Censo (Solo para Auditoría / Personal Autorizado)
export const verificarVotante = async (req: Request, res: Response): Promise<void> => {
    try {
        const { documento } = req.params;
        const docLimpio = validarDocumento(documento);

        const { data: votante, error } = await censoDb
            .from('votantes')
            .select('id_votante, documento_identidad, nombres, apellidos, esta_habilitado, ha_solicitado_token')
            .eq('documento_identidad', docLimpio)
            .maybeSingle();

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
        res.status(error.message?.includes('formato') ? 400 : 500).json({
            success: false,
            error: error.message || 'Error al verificar votante.',
        });
    }
};

// 4. Obtener Setup MFA (Blindado: Requiere token de desafío firmado)
export const obtenerSetupMfa = async (req: Request, res: Response): Promise<void> => {
    try {
        const { challengeToken } = req.body;

        if (!challengeToken) {
            res.status(400).json({ success: false, error: 'Token de desafío de seguridad requerido.' });
            return;
        }

        let decoded: any;
        try {
            decoded = jwt.verify(challengeToken, getJwtSecret(), { algorithms: ['HS256'] });
        } catch {
            res.status(401).json({ success: false, error: 'El desafío de seguridad ha expirado o es inválido. Inicia sesión nuevamente.' });
            return;
        }

        if (!decoded || !decoded.votanteId || (decoded.type !== 'MFA_CHALLENGE' && decoded.type !== 'FORCE_PASSWORD_CHANGE')) {
            res.status(403).json({ success: false, error: 'Token de desafío inválido o no autorizado.' });
            return;
        }

        const { data: votante, error } = await censoDb
            .from('votantes')
            .select('id_votante, correo_institucional, mfa_secret, documento_identidad')
            .eq('id_votante', decoded.votanteId)
            .single();

        if (error || !votante || !votante.mfa_secret) {
            res.status(404).json({ success: false, error: 'Configuración 2FA no encontrada para este elector.' });
            return;
        }

        const accountLabel = votante.correo_institucional || votante.documento_identidad;
        const otpAuthUri = `otpauth://totp/EleccionesSindicales:${accountLabel}?secret=${votante.mfa_secret}&issuer=EleccionesSindicales`;
        const qrDataUrl = await QRCode.toDataURL(otpAuthUri);

        res.json({
            success: true,
            qrCode: qrDataUrl,
            manualKey: votante.mfa_secret,
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'Error al obtener parámetros de autenticación.' });
    }
};