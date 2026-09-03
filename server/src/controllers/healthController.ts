import { Request, Response } from 'express';
import { censoDb, urnaDb } from '../config/supabase';

const startTime = Date.now();

export const checkHealth = async (_req: Request, res: Response): Promise<void> => {
    const t0 = Date.now();
    let censoStatus = 'CONNECTED';
    let urnaStatus = 'CONNECTED';
    let censoLatencyMs = 0;
    let urnaLatencyMs = 0;

    // 1. Probar conectividad con Supabase Censo
    try {
        const c0 = Date.now();
        const { error } = await censoDb.from('personal_electoral').select('id').limit(1);
        censoLatencyMs = Date.now() - c0;
        if (error) censoStatus = `DEGRADED: ${error.message}`;
    } catch (err: any) {
        censoStatus = `DISCONNECTED: ${err.message}`;
    }

    // 2. Probar conectividad con Supabase Urna
    try {
        const u0 = Date.now();
        const { error } = await urnaDb.from('elecciones').select('id_eleccion').limit(1);
        urnaLatencyMs = Date.now() - u0;
        if (error) urnaStatus = `DEGRADED: ${error.message}`;
    } catch (err: any) {
        urnaStatus = `DISCONNECTED: ${err.message}`;
    }

    const isHealthy = censoStatus === 'CONNECTED' && urnaStatus === 'CONNECTED';
    const totalLatencyMs = Date.now() - t0;
    const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

    const memoryUsage = process.memoryUsage();

    res.status(isHealthy ? 200 : 503).json({
        success: isHealthy,
        estado: isHealthy ? 'OPERACIONAL_NORMAL' : 'DEGRADADO',
        timestamp: new Date().toISOString(),
        uptimeSegundos: uptimeSeconds,
        latenciaTotalMs: totalLatencyMs,
        servicios: {
            servidorExpress: {
                estado: 'ONLINE',
                puerto: process.env.PORT || 4000,
                nodeVersion: process.version,
                memoriaRamMb: Math.round(memoryUsage.rss / 1024 / 1024),
            },
            censoDatabase: {
                estado: censoStatus,
                latenciaMs: censoLatencyMs,
            },
            urnaDatabase: {
                estado: urnaStatus,
                latenciaMs: urnaLatencyMs,
            },
        },
        seguridad: {
            helmet: 'ACTIVO',
            rateLimiter: 'ACTIVO',
            cors: 'RESTRICTIVO',
            rbac: 'ACTIVO',
        },
    });
};
