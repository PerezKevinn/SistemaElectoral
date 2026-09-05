import crypto from 'crypto';
import { urnaDb, censoDb } from '../config/supabase';
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

/**
 * Helper para resolver el ID de elección de forma robusta.
 * Si no se proporciona un ID, o si viene 'activa', 'default' o el ID mock,
 * busca automáticamente la elección ABIERTA o la más reciente registrada.
 */
export const resolverEleccionId = async (eleccionId?: any): Promise<string> => {
    if (
        eleccionId &&
        typeof eleccionId === 'string' &&
        eleccionId.trim() !== '' &&
        eleccionId !== 'activa' &&
        eleccionId !== 'default' &&
        eleccionId !== 'a0000000-0000-0000-0000-000000000001'
    ) {
        try {
            const uuid = validarUUID(eleccionId, 'ID de Elección');
            const { data: existe } = await urnaDb
                .from('elecciones')
                .select('id_eleccion')
                .eq('id_eleccion', uuid)
                .maybeSingle();

            if (existe) {
                return uuid;
            }
        } catch {
            // Si el ID no es UUID o no existe, intentar resolver la elección activa
        }
    }

    // 1. Buscar elección ABIERTA
    const { data: abierta } = await urnaDb
        .from('elecciones')
        .select('id_eleccion')
        .eq('estado', 'ABIERTA')
        .order('creado_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (abierta) {
        return abierta.id_eleccion;
    }

    // 2. Si no hay abierta, buscar la última creada/cerrada
    const { data: ultima } = await urnaDb
        .from('elecciones')
        .select('id_eleccion')
        .order('creado_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (ultima) {
        return ultima.id_eleccion;
    }

    throw new Error('No existe ninguna jornada electoral registrada en el sistema.');
};

export const obtenerEleccionActiva = async (req: Request, res: Response): Promise<void> => {
    try {
        // 1. Intentar obtener elección ABIERTA
        const { data: abierta, error: errAbierta } = await urnaDb
            .from('elecciones')
            .select('id_eleccion, titulo, descripcion, estado, creado_at, fecha_inicio, fecha_fin')
            .eq('estado', 'ABIERTA')
            .order('creado_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (errAbierta) throw errAbierta;

        if (abierta) {
            res.json({ success: true, eleccion: abierta });
            return;
        }

        // 2. Si no hay ABIERTA, devolver la última registrada
        const { data: ultima, error: errUltima } = await urnaDb
            .from('elecciones')
            .select('id_eleccion, titulo, descripcion, estado, creado_at, fecha_inicio, fecha_fin')
            .order('creado_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (errUltima) throw errUltima;

        res.json({ success: true, eleccion: ultima || null });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message || 'Error al obtener elección activa.' });
    }
};

export const listarElecciones = async (req: Request, res: Response): Promise<void> => {
    try {
        const { data: elecciones, error } = await urnaDb
            .from('elecciones')
            .select('id_eleccion, titulo, descripcion, estado, creado_at, fecha_inicio, fecha_fin')
            .order('creado_at', { ascending: false });

        if (error) throw error;

        res.json({ success: true, elecciones: elecciones || [] });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message || 'Error al listar elecciones.' });
    }
};

export const obtenerCandidatos = async (req: Request, res: Response): Promise<void> => {
    try {
        const { eleccionId } = req.query;
        const idEleccion = await resolverEleccionId(eleccionId);

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
            eleccionId: idEleccion,
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
        const idEleccion = await resolverEleccionId(eleccionId);

        const { data, error } = await urnaDb.rpc('obtener_escrutinio', {
            p_eleccion_id: idEleccion,
        });

        if (error) throw error;

        res.json({
            success: true,
            eleccionId: idEleccion,
            data,
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message || 'Error al obtener escrutinio institucional.',
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

        const ejecutadoPor = req.usuario?.nombre || req.usuario?.documento || req.usuario?.id || 'Administrador General';
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
        const ejecutadoPor = req.usuario?.nombre || req.usuario?.documento || req.usuario?.id || 'Administrador General';
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
        const idEleccion = await resolverEleccionId(eleccionId);

        // 1. Obtener información de la elección
        const { data: eleccion, error: errEleccion } = await urnaDb
            .from('elecciones')
            .select('id_eleccion, titulo, descripcion, estado, creado_at')
            .eq('id_eleccion', idEleccion)
            .single();

        if (errEleccion || !eleccion) {
            res.status(404).json({ success: false, error: 'Elección no encontrada en el sistema.' });
            return;
        }

        // 2. Obtener escrutinio oficial mediante RPC
        const { data: escrutinio, error: errEscrutinio } = await urnaDb.rpc('obtener_escrutinio', {
            p_eleccion_id: idEleccion,
        });

        if (errEscrutinio) throw errEscrutinio;

        // 3. Obtener el primer hash (génesis) y el último hash de la cadena
        const { data: primerVoto } = await urnaDb
            .from('votos')
            .select('voto_hash, prev_hash')
            .eq('id_eleccion', idEleccion)
            .order('secuencia_conteo', { ascending: true })
            .limit(1)
            .maybeSingle();

        const { data: ultimoVoto } = await urnaDb
            .from('votos')
            .select('voto_hash, secuencia_conteo')
            .eq('id_eleccion', idEleccion)
            .order('secuencia_conteo', { ascending: false })
            .limit(1)
            .maybeSingle();

        // 4. Estructurar Acta Oficial
        const totalVotos = escrutinio?.totalVotos ?? 0;
        const tokensConsumidos = escrutinio?.tokensConsumidos ?? 0;

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
                totalVotosValidos: totalVotos,
                totalTokensConsumidos: tokensConsumidos,
                balanceConsistencia: totalVotos === tokensConsumidos ? 'EXACTO_1_A_1' : 'DISCREPANCIA',
                hashGenesisPrev: primerVoto?.prev_hash || 'GENESIS_0000000000000000000000000000000000000000000000000000000000000000',
                selloRaizFinalHash: ultimoVoto?.voto_hash || 'SIN_VOTOS_REGISTRADOS',
                totalBloquesEncadenados: ultimoVoto?.secuencia_conteo || 0,
            },
            resultados: escrutinio?.conteo || [],
        };

        res.json({
            success: true,
            eleccionId: idEleccion,
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
        let idEleccion: string | null = null;
        try {
            idEleccion = await resolverEleccionId(eleccionId);
        } catch { }

        let query = urnaDb
            .from('logs_auditoria_admin')
            .select('*')
            .order('creado_at', { ascending: false });

        // Si viene un ID de elección, traer eventos de esa elección Y eventos globales del sistema (id_eleccion es null)
        if (idEleccion && typeof idEleccion === 'string' && idEleccion.trim() !== '') {
            query = query.or(`id_eleccion.eq.${idEleccion},id_eleccion.is.null`);
        }

        const { data: logs, error } = await query;
        if (error) throw error;

        // Consultar personal electoral en el censo para mapear UUIDs -> Nombres legibles
        const { data: personal } = await censoDb
            .from('personal_electoral')
            .select('id, documento_identidad, nombres, apellidos, cargo, rol');

        const mapPersonal: Record<string, { nombre: string; cargo: string; documento: string; rol: string }> = {};
        if (personal) {
            for (const p of personal) {
                const nombreCompleto = `${p.nombres || ''} ${p.apellidos || ''}`.trim() || p.documento_identidad;
                const info = {
                    nombre: nombreCompleto,
                    cargo: p.cargo || '',
                    documento: p.documento_identidad || '',
                    rol: p.rol || '',
                };
                if (p.id) mapPersonal[p.id] = info;
                if (p.documento_identidad) mapPersonal[p.documento_identidad] = info;
            }
        }

        const logsEnriquecidos = (logs || []).map((log) => {
            const ejecutado = String(log.ejecutado_por || '').trim();
            const match = mapPersonal[ejecutado];
            
            let nombreUsuario = ejecutado;
            if (match) {
                nombreUsuario = match.nombre;
            } else if (ejecutado === 'ADMIN_OFICIAL' || ejecutado === 'ADMIN' || !ejecutado) {
                nombreUsuario = 'Administrador General';
            } else if (ejecutado.length > 25 && /^[0-9a-fA-F-]+$/.test(ejecutado)) {
                // Si es un UUID que no coincidió, mostrar Administrador Autorizado
                nombreUsuario = 'Administrador Autorizado';
            }

            return {
                ...log,
                ejecutado_por_nombre: nombreUsuario,
                cargo_usuario: match?.cargo || (ejecutado === 'ADMIN_OFICIAL' ? 'Administrador General' : null),
                rol_usuario: match?.rol || null,
            };
        });

        res.json({ success: true, eleccionId: idEleccion, logs: logsEnriquecidos });
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'Error al consultar logs de auditoría.' });
    }
};

export const verificarIntegridadCadena = async (req: Request, res: Response): Promise<void> => {
    try {
        const { eleccionId } = req.query;
        const idEleccion = await resolverEleccionId(eleccionId);
        const t0 = Date.now();

        // Obtener todos los votos ordenados por secuencia_conteo ascendente
        const { data: votos, error } = await urnaDb
            .from('votos')
            .select('id_voto, voto_hash, prev_hash, secuencia_conteo, id_candidato')
            .eq('id_eleccion', idEleccion)
            .order('secuencia_conteo', { ascending: true });

        if (error) throw error;

        const totalBloques = votos?.length || 0;
        const bloquesVerificados = [];
        let esIntegra = true;
        let motivoFallo: string | null = null;
        let bloqueInvalidoIndex: number | null = null;

        const GENESIS_DEFAULT = '0000000000000000000000000000000000000000000000000000000000000000';

        if (votos && votos.length > 0) {
            for (let i = 0; i < votos.length; i++) {
                const votoActual = votos[i];

                // 1. Validar enlace criptográfico previo si no es el primer voto de la serie
                if (i > 0) {
                    const votoPrevio = votos[i - 1];
                    if (votoActual.prev_hash !== votoPrevio.voto_hash) {
                        esIntegra = false;
                        motivoFallo = `Discrepancia criptográfica en bloque #${votoActual.secuencia_conteo}: Su prev_hash (${votoActual.prev_hash.substring(0, 12)}...) no coincide con el hash del bloque previo (${votoPrevio.voto_hash.substring(0, 12)}...).`;
                        bloqueInvalidoIndex = i;
                        break;
                    }
                }

                bloquesVerificados.push({
                    secuencia: votoActual.secuencia_conteo,
                    idVoto: votoActual.id_voto,
                    votoHash: votoActual.voto_hash,
                    prevHash: votoActual.prev_hash,
                    estadoCriptografico: 'VALIDO',
                });
            }
        }

        const duracionMs = Date.now() - t0;
        const hashRaizFinal = votos && votos.length > 0 ? votos[votos.length - 1].voto_hash : 'SIN_VOTOS';

        res.json({
            success: true,
            eleccionId: idEleccion,
            auditoria: {
                esIntegra,
                motivoFallo,
                bloqueInvalidoIndex,
                totalBloquesAnalizados: totalBloques,
                duracionVerificacionMs: duracionMs,
                hashGenesis: votos && votos.length > 0 ? votos[0].prev_hash : GENESIS_DEFAULT,
                hashRaizFinal,
                timestampVerificacion: new Date().toISOString(),
                bloques: bloquesVerificados,
            },
        });
    } catch (error: any) {
        console.error('Error al verificar integridad de la cadena:', error);
        res.status(500).json({ success: false, error: 'Error al ejecutar auditoría matemática de la cadena.' });
    }
};