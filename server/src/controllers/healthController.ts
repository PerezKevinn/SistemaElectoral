import { Request, Response } from 'express';
import { censoDb, urnaDb } from '../config/supabase';

const startTime = Date.now();

export const checkHealth = async (_req: Request, res: Response): Promise<void> => {
    let censoOk = false;
    let urnaOk = false;

    // 1. Probar conectividad con Supabase Censo
    try {
        const { error } = await censoDb.from('personal_electoral').select('id').limit(1);
        censoOk = !error;
    } catch {
        censoOk = false;
    }

    // 2. Probar conectividad con Supabase Urna
    try {
        const { error } = await urnaDb.from('elecciones').select('id_eleccion').limit(1);
        urnaOk = !error;
    } catch {
        urnaOk = false;
    }

    const isHealthy = censoOk && urnaOk;
    const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);

    res.status(isHealthy ? 200 : 503).json({
        success: isHealthy,
        estado: isHealthy ? 'OPERACIONAL_NORMAL' : 'DEGRADADO',
        timestamp: new Date().toISOString(),
        uptimeSegundos: uptimeSeconds,
        servicios: {
            censoDatabase: censoOk ? 'ONLINE' : 'DEGRADED',
            urnaDatabase: urnaOk ? 'ONLINE' : 'DEGRADED',
        },
    });
};
