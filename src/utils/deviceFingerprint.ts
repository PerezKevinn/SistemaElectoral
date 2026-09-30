/**
 * Utilidad de Identificación de Dispositivo y Huella Digital Criptográfica (Device Fingerprint)
 * Combina UUID persistente en navegador (localStorage + Cookie) con una huella de hardware/entorno
 * para auditoría electoral y detección de suplantación o registros múltiples desde el mismo equipo.
 */

const STORAGE_KEY = 'elec_sindicato_device_id';
const COOKIE_KEY = '_elec_device_id';

/**
 * Genera un UUID v4 criptográficamente seguro
 */
const generarUUIDv4 = (): string => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID().toLowerCase();
    }

    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const buf = new Uint8Array(16);
        crypto.getRandomValues(buf);
        buf[6] = (buf[6] & 0x0f) | 0x40; // Version 4
        buf[8] = (buf[8] & 0x3f) | 0x80; // Variant RFC4122
        const hex = Array.from(buf).map((b) => b.toString(16).padStart(2, '0')).join('');
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
    }

    // Fallback matemático
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
};

/**
 * Lee o escribe el ID de dispositivo en una Cookie persistente (1 año)
 */
const getCookie = (name: string): string | null => {
    try {
        const match = document.cookie.match(new RegExp('(^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)'));
        return match ? decodeURIComponent(match[2]) : null;
    } catch {
        return null;
    }
};

const setCookie = (name: string, value: string) => {
    try {
        const maxAge = 365 * 24 * 60 * 60; // 1 año
        document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAge}; path=/; SameSite=Lax`;
    } catch {
        // Silencioso si las cookies están deshabilitadas
    }
};

/**
 * Obtiene o crea un UUID persistente para este navegador / dispositivo
 */
export const getOrGenerateDeviceId = (): string => {
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

    // 1. Intentar desde localStorage
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && uuidRegex.test(stored)) {
            setCookie(COOKIE_KEY, stored);
            return stored.toLowerCase();
        }
    } catch {
        // En caso de modo incógnito restrictivo
    }

    // 2. Intentar desde Cookie
    const fromCookie = getCookie(COOKIE_KEY);
    if (fromCookie && uuidRegex.test(fromCookie)) {
        try {
            localStorage.setItem(STORAGE_KEY, fromCookie.toLowerCase());
        } catch {}
        return fromCookie.toLowerCase();
    }

    // 3. Generar nuevo UUID persistente
    const nuevoId = generarUUIDv4().toLowerCase();

    try {
        localStorage.setItem(STORAGE_KEY, nuevoId);
    } catch {}

    setCookie(COOKIE_KEY, nuevoId);

    return nuevoId;
};

/**
 * Genera una firma visual única en Canvas (Canvas Fingerprinting)
 */
const getCanvasFingerprint = (): string => {
    try {
        const canvas = document.createElement('canvas');
        canvas.width = 240;
        canvas.height = 60;
        const ctx = canvas.getContext('2d');
        if (!ctx) return 'no-canvas';

        // Fondo con gradiente
        const grad = ctx.createLinearGradient(0, 0, 240, 60);
        grad.addColorStop(0, '#0f172a');
        grad.addColorStop(1, '#06b6d4');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 240, 60);

        // Texto con sombras y múltiples capas tipográficas
        ctx.textBaseline = 'alphabetic';
        ctx.font = "14px 'Arial', sans-serif";
        ctx.fillStyle = '#f8fafc';
        ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
        ctx.shadowBlur = 6;
        ctx.fillText('Elecciones 2026 🗳️ Sindicato 🛡️', 8, 28);

        // Formas geométricas y curvas
        ctx.beginPath();
        ctx.arc(200, 30, 16, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fillStyle = 'rgba(245, 158, 11, 0.7)';
        ctx.fill();

        return canvas.toDataURL();
    } catch {
        return 'canvas-blocked';
    }
};

/**
 * Obtiene la tarjeta gráfica y renderizador WebGL del dispositivo
 */
const getWebGLInfo = (): string => {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) return 'no-webgl';

        const glTyped = gl as WebGLRenderingContext;
        const debugInfo = glTyped.getExtension('WEBGL_debug_renderer_info');
        if (!debugInfo) {
            return `${glTyped.getParameter(glTyped.VENDOR)}~${glTyped.getParameter(glTyped.RENDERER)}`;
        }

        const vendor = glTyped.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '';
        const renderer = glTyped.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
        return `${vendor}~${renderer}`;
    } catch {
        return 'webgl-blocked';
    }
};

/**
 * Convierte un texto en un hash criptográfico SHA-256 hexadecimal de 64 caracteres
 */
const sha256Hex = async (texto: string): Promise<string> => {
    try {
        if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
            const encoder = new TextEncoder();
            const data = encoder.encode(texto);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
        }
    } catch {}

    // Fallback de hashing rápido FNV-1a / Murmur ampliado a 64 chars si Web Crypto no está disponible
    let h1 = 0xdeadbeef;
    let h2 = 0x41c6ce57;
    for (let i = 0; i < texto.length; i++) {
        const ch = texto.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    const hexPart1 = (h1 >>> 0).toString(16).padStart(8, '0');
    const hexPart2 = (h2 >>> 0).toString(16).padStart(8, '0');
    return `${hexPart1}${hexPart2}${hexPart1}${hexPart2}${hexPart1}${hexPart2}${hexPart1}${hexPart2}`.slice(0, 64);
};

// Cache en memoria para evitar recalcular Canvas / WebGL en cada clic
let cachedFingerprint: string | null = null;

/**
 * Genera la huella digital (Fingerprint) del dispositivo / navegador
 */
export const getDeviceFingerprint = async (): Promise<string> => {
    if (cachedFingerprint) return cachedFingerprint;

    try {
        const componentes = [
            navigator.userAgent || '',
            navigator.language || '',
            (navigator.languages || []).join(','),
            `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`,
            `${window.devicePixelRatio || 1}`,
            Intl.DateTimeFormat().resolvedOptions().timeZone || '',
            `${new Date().getTimezoneOffset()}`,
            `${navigator.hardwareConcurrency || 0}`,
            `${(navigator as any).deviceMemory || 0}`,
            `${navigator.platform || ''}`,
            `${navigator.maxTouchPoints || 0}`,
            getCanvasFingerprint(),
            getWebGLInfo(),
        ];

        const firmaCruda = componentes.join('###');
        cachedFingerprint = await sha256Hex(firmaCruda);
        return cachedFingerprint;
    } catch {
        // Fallback en caso de error extremo
        return sha256Hex(navigator.userAgent + window.screen.width);
    }
};

export interface TelemetriaCliente {
    deviceId: string;
    deviceFingerprint: string;
    screenRes: string;
    timeZone: string;
    language: string;
    platform: string;
}

/**
 * Obtiene la telemetría completa del cliente lista para enviar al backend
 */
export const getDeviceTelemetry = async (): Promise<TelemetriaCliente> => {
    const deviceId = getOrGenerateDeviceId();
    const deviceFingerprint = await getDeviceFingerprint();

    return {
        deviceId,
        deviceFingerprint,
        screenRes: `${window.screen.width}x${window.screen.height}`,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Bogota',
        language: navigator.language || 'es-CO',
        platform: navigator.platform || 'Web',
    };
};

/**
 * Retorna las cabeceras HTTP con la telemetría de dispositivo para usar en fetch()
 */
export const getTelemetryHeaders = async (): Promise<Record<string, string>> => {
    const deviceId = getOrGenerateDeviceId();
    const deviceFingerprint = await getDeviceFingerprint();

    return {
        'x-device-id': deviceId,
        'x-device-fingerprint': deviceFingerprint,
    };
};
