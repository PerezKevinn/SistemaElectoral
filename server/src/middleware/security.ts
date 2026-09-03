import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

// 1. Limitador contra Fuerza Bruta en Autenticación (Paso 1 y Staff Login)
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10, // Máximo 10 intentos por IP en la ventana
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Demasiados intentos de acceso fallidos. Por seguridad, tu dirección IP ha sido temporalmente bloqueada por 15 minutos.',
    },
});

// 2. Limitador estricto para intentos de código TOTP / 2FA (Paso 2)
export const totpLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutos
    max: 6, // Máximo 6 intentos por IP para evitar adivinar el código de 6 dígitos
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Has excedido el número máximo de intentos del código de verificación 2FA. Inicia sesión nuevamente.',
    },
});

// 3. Limitador para Emisión y Verificación de Votos
export const voteLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minuto
    max: 15, // Máximo 15 peticiones por minuto
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Tasa de peticiones a la urna digital excedida. Por favor espera un momento.',
    },
});

// 4. Limitador global para API
export const apiGlobalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 300, // 300 peticiones por IP
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: 'Límite de solicitudes al sistema excedido.',
    },
});

// 5. Utilidades de Sanitización y Validación de Entradas
export const validarDocumento = (doc: any): string => {
    if (!doc || typeof doc !== 'string' && typeof doc !== 'number') {
        throw new Error('El documento de identidad es requerido.');
    }
    const limpio = String(doc).trim();
    if (!/^[a-zA-Z0-9.\-_]{4,25}$/.test(limpio)) {
        throw new Error('El formato del documento de identidad no es válido.');
    }
    return limpio;
};

export const validarHexToken = (token: any): string => {
    if (!token || typeof token !== 'string') {
        throw new Error('El token de votación es requerido.');
    }
    const limpio = token.trim();
    if (!/^[a-fA-F0-9]{64}$/.test(limpio)) {
        throw new Error('El formato del token criptográfico no es válido (debe ser SHA-256 de 64 caracteres hexadecimales).');
    }
    return limpio;
};

export const validarUUID = (id: any, nombreCampo: string = 'Identificador'): string => {
    if (!id || typeof id !== 'string') {
        throw new Error(`${nombreCampo} es requerido.`);
    }
    const limpio = id.trim();
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(limpio)) {
        throw new Error(`${nombreCampo} no tiene un formato UUID válido.`);
    }
    return limpio;
};

export const validarPasswordFuerte = (password: any): string => {
    if (!password || typeof password !== 'string') {
        throw new Error('La contraseña es requerida.');
    }
    const limpia = password.trim();
    if (limpia.length < 6) {
        throw new Error('La contraseña debe tener como mínimo 6 caracteres.');
    }
    return limpia;
};
