import crypto from 'crypto';
import { urnaDb } from '../config/supabase';
import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authRole';
import { validarUUID, validarHexToken } from '../middleware/security';

export const emitirVoto = async (req: Request, res: Response): Promise<void> => {
    try {
        const { eleccionId, tokenPlano, candidatoId } = req.body;

        if (!eleccionId || !tokenPlano || !candidatoId) {
            res.status(400).json({ success: false, error: 'Parámetros de sufragio incompletos.' });
            return;
        }

        const idEleccion = validarUUID(eleccionId, 'ID de Elección');
        const idCandidato = validarUUID(candidatoId, 'ID de Candidato');
        const tokenLimpio = validarHexToken(tokenPlano);

        // Calcular hash criptográfico SHA-256 del token ciego
        const tokenHash = crypto.createHash('sha256').update(tokenLimpio).digest('hex');

        // Invocar el procedimiento almacenado (RPC) atómico en la Urna Digital
        const { data, error } = await urnaDb.rpc('registrar_voto_seguro', {
            p_id_eleccion: idEleccion,
            p_token_hash: tokenHash,
            p_id_candidato: idCandidato,
        });

        if (error) {
            console.error('Error en RPC registrar_voto_seguro:', error);
            res.status(500).json({ success: false, error: 'Error al depositar el voto en la urna digital.' });
            return;
        }

        if (!data || !data.success) {
            res.status(400).json({ success: false, error: data?.error || 'Token inválido o ya consumido.' });
            return;
        }

        // Retorna únicamente el comprobante hash de auditoría
        res.json({
            success: true,
            comprobanteHash: data.comprobante_hash,
        });
    } catch (error: any) {
        console.error('⚠️ [SEGURIDAD] Error en emitirVoto:', error.message);
        res.status(error.message?.includes('formato') ? 400 : 500).json({
            success: false,
            error: error.message?.includes('formato') ? error.message : 'Error al procesar el depósito del voto.',
        });
    }
};

export const obtenerCandidatos = async (req: Request, res: Response): Promise<void> => {
    try {
        const { eleccionId } = req.query;

        if (!eleccionId) {
            res.status(400).json({ success: false, error: 'eleccionId es requerido' });
            return;
        }

        const idEleccion = validarUUID(eleccionId, 'ID de Elección');

        const { data: candidatos, error } = await urnaDb
            .from('candidatos')
            .select('id_candidato, numero_lista, nombre_completo, foto_url')
            .eq('id_eleccion', idEleccion)
            .order('numero_lista', { ascending: true });

        if (error) {
            throw error;
        }

        res.json({
            success: true,
            candidatos: (candidatos || []).map((c) => ({
                id: c.id_candidato,
                nombre: c.nombre_completo,
                numeroLista: c.numero_lista,
                fotoUrl: c.foto_url,
            })),
        });
    } catch (error: any) {
        res.status(error.message?.includes('formato') ? 400 : 500).json({
            success: false,
            error: error.message || 'Error al obtener candidatos.',
        });
    }
};

export const obtenerResultados = async (req: Request, res: Response): Promise<void> => {
    try {
        const { eleccionId } = req.query;

        if (!eleccionId) {
            res.status(400).json({ success: false, error: 'eleccionId es requerido' });
            return;
        }

        const idEleccion = validarUUID(eleccionId, 'ID de Elección');

        const { data, error } = await urnaDb.rpc('obtener_escrutinio', {
            p_eleccion_id: idEleccion,
        });

        if (error) throw error;

        res.json({
            success: true,
            data,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: 'Error al obtener escrutinio institucional.',
        });
    }
};

export const verificarComprobante = async (req: Request, res: Response): Promise<void> => {
    try {
        const hashRaw = (req.body.comprobanteHash || req.body.hash || '');
        const hash = validarHexToken(hashRaw);

        const { data: voto, error } = await urnaDb
            .from('votos')
            .select('id_voto, id_eleccion, voto_hash, secuencia_conteo')
            .eq('voto_hash', hash)
            .maybeSingle();

        if (error) {
            throw error;
        }

        if (!voto) {
            res.status(404).json({
                success: false,
                error: 'El comprobante ingresado no existe en la urna digital de esta elección.'
            });
            return;
        }

        res.json({
            success: true,
            mensaje: 'Papeleta verificada con éxito',
            comprobante: voto.voto_hash,
            secuencia: voto.secuencia_conteo,
            fecha: new Date().toISOString(),
        });
    } catch (err: any) {
        console.error('Error al verificar comprobante:', err.message);
        res.status(err.message?.includes('formato') ? 400 : 500).json({
            success: false,
            error: err.message || 'Error interno al consultar la urna digital.',
        });
    }
};

export const crearEleccion = async (req: Request, res: Response): Promise<void> => {
    try {
        const { titulo, descripcion, candidatos, adminClave } = req.body;

        if (!titulo || !candidatos || !Array.isArray(candidatos) || !adminClave) {
            res.status(400).json({ success: false, error: 'Datos incompletos para crear la elección.' });
            return;
        }

        const { data: idEleccion, error } = await urnaDb.rpc('crear_eleccion', {
            p_titulo: titulo,
            p_descripcion: descripcion || '',
            p_candidatos: candidatos,
            p_admin_clave: adminClave,
        });

        if (error) throw error;

        res.json({ success: true, idEleccion });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message || 'Error al crear la elección.' });
    }
};

export const abrirEleccion = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { eleccionId, adminClave } = req.body;

        const ejecutadoPor = req.usuario?.id || 'ADMIN_OFICIAL';
        const ipOrigen = req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1';
        const userAgent = (req.headers['user-agent'] as string) || 'Desconocido';

        if (!eleccionId || !adminClave) {
            res.status(400).json({ success: false, error: 'Se requiere eleccionId y adminClave.' });
            return;
        }

        const { data, error } = await urnaDb.rpc('abrir_eleccion_oficial', {
            p_eleccion_id: eleccionId,
            p_admin_clave: adminClave,
            p_ejecutado_por: ejecutadoPor,
            p_ip_origen: ipOrigen,
            p_user_agent: userAgent,
        });

        if (error) throw error;

        res.json({ success: true, data });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message || 'Error al abrir la elección.' });
    }
};

export const cerrarEleccion = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { eleccionId, adminClave } = req.body;

        // Obtener identidad del usuario desde el JWT o fallback
        const ejecutadoPor = req.usuario?.id || 'ADMIN_OFICIAL';
        const ipOrigen = req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1';
        const userAgent = req.headers['user-agent'] || 'Desconocido';

        if (!eleccionId || !adminClave) {
            res.status(400).json({
                success: false,
                error: 'Se requiere el ID de la elección y la clave administrativa de cierre.',
            });
            return;
        }

        const { data, error } = await urnaDb.rpc('cerrar_eleccion_oficial', {
            p_eleccion_id: eleccionId,
            p_admin_clave: adminClave,
            p_ejecutado_por: ejecutadoPor,
            p_ip_origen: ipOrigen,
            p_user_agent: userAgent,
        });

        if (error) throw error;

        res.json({
            success: true,
            data,
        });
    } catch (error: any) {
        res.status(400).json({
            success: false,
            error: error.message || 'Error al ejecutar el cierre administrativo.',
        });
    }
};

export const obtenerActaOficial = async (req: Request, res: Response): Promise<void> => {
    try {
        const { eleccionId } = req.query;

        if (!eleccionId) {
            res.status(400).json({ success: false, error: 'eleccionId es requerido' });
            return;
        }

        // 1. Obtener información de la elección
        const { data: eleccion, error: errEleccion } = await urnaDb
            .from('elecciones')
            .select('id_eleccion, titulo, descripcion, estado, creado_at')
            .eq('id_eleccion', eleccionId)
            .single();

        if (errEleccion || !eleccion) {
            res.status(404).json({ success: false, error: 'Elección no encontrada' });
            return;
        }

        // 2. Obtener escrutinio oficial mediante RPC
        const { data: escrutinio, error: errEscrutinio } = await urnaDb.rpc('obtener_escrutinio', {
            p_eleccion_id: eleccionId,
        });

        if (errEscrutinio) throw errEscrutinio;

        // 3. Obtener el primer hash (génesis) y el último hash de la cadena
        const { data: primerVoto } = await urnaDb
            .from('votos')
            .select('voto_hash, prev_hash')
            .eq('id_eleccion', eleccionId)
            .order('secuencia_conteo', { ascending: true })
            .limit(1)
            .maybeSingle();

        const { data: ultimoVoto } = await urnaDb
            .from('votos')
            .select('voto_hash, secuencia_conteo')
            .eq('id_eleccion', eleccionId)
            .order('secuencia_conteo', { ascending: false })
            .limit(1)
            .maybeSingle();

        // 4. Estructurar Acta Oficial
        const actaOficial = {
            tipoDocumento: 'ACTA_OFICIAL_ESCRUTINIO_CRIPTOGRAFICO',
            versionProtocolo: '1.0-SHA256-DECOUPLED',
            generadaAt: new Date().toISOString(),
            eleccion: {
                id: eleccion.id_eleccion,
                titulo: eleccion.titulo,
                estado: eleccion.estado,
                iniciadaAt: eleccion.creado_at,
            },
            auditoriaCriptografica: {
                totalVotosValidos: escrutinio.totalVotos,
                totalTokensConsumidos: escrutinio.tokensConsumidos,
                balanceConsistencia: escrutinio.totalVotos === escrutinio.tokensConsumidos ? 'EXACTO_1_A_1' : 'DISCREPANCIA',
                hashGenesisPrev: primerVoto?.prev_hash || 'GENESIS_0000000000000000000000000000000000000000000000000000000000000000',
                selloRaizFinalHash: ultimoVoto?.voto_hash || 'SIN_VOTOS_REGISTRADOS',
                totalBloquesEncadenados: ultimoVoto?.secuencia_conteo || 0,
            },
            resultados: escrutinio.conteo,
        };

        res.json({
            success: true,
            acta: actaOficial,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message || 'Error al generar el acta oficial de escrutinio.',
        });
    }
};

export const obtenerLogsAuditoria = async (req: Request, res: Response): Promise<void> => {
    try {
        const { eleccionId } = req.query;

        let query = urnaDb
            .from('logs_auditoria_admin')
            .select('*')
            .order('creado_at', { ascending: false });

        // Si viene un ID de elección, traer eventos de esa elección Y eventos globales del sistema (id_eleccion es null)
        if (eleccionId && typeof eleccionId === 'string' && eleccionId.trim() !== '') {
            query = query.or(`id_eleccion.eq.${eleccionId},id_eleccion.is.null`);
        }

        const { data, error } = await query;
        if (error) throw error;

        res.json({ success: true, logs: data || [] });
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'Error al consultar logs de auditoría.' });
    }
};