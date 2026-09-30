import { Request } from 'express';

/**
 * Normaliza y sanitiza una dirección IP (elimina puertos, prefijos IPv6 mapped, loopbacks)
 */
export const sanitizarIp = (ipRaw?: string | null): string => {
    if (!ipRaw || typeof ipRaw !== 'string') return '127.0.0.1';

    let ip = ipRaw.trim();

    // Si viene en formato IPv6 mapped IPv4 (ej. ::ffff:190.25.10.5)
    if (ip.startsWith('::ffff:')) {
        ip = ip.substring(7);
    }

    // Si viene localhost IPv6
    if (ip === '::1') {
        return '127.0.0.1';
    }

    // Si viene con puerto (ej. 190.25.10.5:54321 o [::1]:8080)
    if (ip.includes(':') && !ip.includes('::')) {
        const parts = ip.split(':');
        if (parts.length === 2 && /^\d+$/.test(parts[1])) {
            ip = parts[0];
        }
    }

    return ip || '127.0.0.1';
};

/**
 * Verifica si una dirección IP pertenece a un rango privado o de proxy interno
 */
export const esIpPrivada = (ip: string): boolean => {
    const limpia = sanitizarIp(ip);

    // Loopback
    if (limpia === '127.0.0.1' || limpia === 'localhost') return true;

    // Rango 10.0.0.0 - 10.255.255.255 (Común en Render, Docker, AWS VPC)
    if (/^10\./.test(limpia)) return true;

    // Rango 172.16.0.0 - 172.31.255.255
    if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(limpia)) return true;

    // Rango 192.168.0.0 - 192.168.255.255
    if (/^192\.168\./.test(limpia)) return true;

    // Link-local 169.254.0.0/16
    if (/^169\.254\./.test(limpia)) return true;

    // Rango carrier-grade NAT 100.64.0.0/10
    if (/^100\.(6[4-9]|[7-9][0-9]|1[0-1][0-9]|12[0-7])\./.test(limpia)) return true;

    return false;
};

/**
 * Obtiene la dirección IP pública real del cliente saltando proxies inversos (Render, Vercel, Cloudflare, Nginx)
 */
export const obtenerIpCliente = (req: Request): string => {
    // 1. Cabecera directa de Cloudflare (la más confiable si se usa Cloudflare)
    const cfIp = req.headers['cf-connecting-ip'];
    if (typeof cfIp === 'string' && cfIp.trim()) {
        const clean = sanitizarIp(cfIp);
        if (clean && clean !== '127.0.0.1') return clean;
    }

    // 2. Cabecera X-Real-IP (Nginx / Ingress Controller)
    const realIp = req.headers['x-real-ip'];
    if (typeof realIp === 'string' && realIp.trim()) {
        const clean = sanitizarIp(realIp);
        if (clean && !esIpPrivada(clean)) return clean;
    }

    // 3. Cabecera X-Client-IP
    const clientIp = req.headers['x-client-ip'];
    if (typeof clientIp === 'string' && clientIp.trim()) {
        const clean = sanitizarIp(clientIp);
        if (clean && !esIpPrivada(clean)) return clean;
    }

    // 4. Cadena X-Forwarded-For (cliente, proxy1, proxy2)
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        const rawString = Array.isArray(forwarded) ? forwarded[0] : forwarded;
        const ipList = rawString.split(',').map((item) => sanitizarIp(item.trim())).filter(Boolean);

        // Buscar la primera IP pública de izquierda a derecha (IP originaria del cliente)
        for (const candidate of ipList) {
            if (!esIpPrivada(candidate)) {
                return candidate;
            }
        }

        // Si todas son privadas (ej. entorno local de desarrollo o LAN institucional), devolver la primera
        if (ipList.length > 0) {
            return ipList[0];
        }
    }

    // 5. Fallback a req.ip o remoteAddress del socket
    const fallback = req.ip || req.socket?.remoteAddress || '127.0.0.1';
    return sanitizarIp(fallback);
};

export interface TelemetriaDispositivo {
    ip: string;
    userAgent: string;
    deviceId: string | null;
    deviceFingerprint: string | null;
}

/**
 * Extrae la telemetría completa de red y dispositivo desde la petición HTTP
 */
export const obtenerTelemetriaDispositivo = (req: Request): TelemetriaDispositivo => {
    const ip = obtenerIpCliente(req);
    const userAgent = (req.headers['user-agent'] as string) || 'Desconocido';

    // Obtener UUID de dispositivo persistente desde cabeceras o cuerpo
    const rawDeviceId =
        (req.headers['x-device-id'] as string) ||
        (req.body?.deviceId as string) ||
        (req.headers['x-device-uuid'] as string) ||
        null;

    let deviceId: string | null = null;
    if (rawDeviceId && typeof rawDeviceId === 'string') {
        const cleanId = rawDeviceId.trim();
        // Validar formato UUID v4
        if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(cleanId)) {
            deviceId = cleanId.toLowerCase();
        }
    }

    // Obtener Huella Digital (Fingerprint) calculada en frontend
    const rawFingerprint =
        (req.headers['x-device-fingerprint'] as string) ||
        (req.body?.deviceFingerprint as string) ||
        null;

    let deviceFingerprint: string | null = null;
    if (rawFingerprint && typeof rawFingerprint === 'string') {
        const cleanFp = rawFingerprint.trim();
        // Validar formato hash hexadecimal (SHA-256 de 64 caracteres)
        if (/^[0-9a-fA-F]{32,64}$/.test(cleanFp)) {
            deviceFingerprint = cleanFp.toLowerCase();
        }
    }

    return {
        ip,
        userAgent,
        deviceId,
        deviceFingerprint,
    };
};
