import { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { censoDb, urnaDb } from '../config/supabase';
import { AuthRequest } from '../middleware/authRole';
import { validarDocumento } from '../middleware/security';
import { enviarCredencialesVotante } from '../services/emailService';

/**
 * Genera una contraseña aleatoria de alta entropía (10 caracteres)
 */
const generarPasswordSegura = (): string => {
    const charsMayus = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const charsMinus = 'abcdefghjkmnpqrstuvwxyz';
    const charsNum = '23456789';
    const charsEspeciales = '#$%&*+@!';

    let pass = '';
    pass += charsMayus[crypto.randomInt(0, charsMayus.length)];
    pass += charsMinus[crypto.randomInt(0, charsMinus.length)];
    pass += charsNum[crypto.randomInt(0, charsNum.length)];
    pass += charsEspeciales[crypto.randomInt(0, charsEspeciales.length)];

    const todos = charsMayus + charsMinus + charsNum + charsEspeciales;
    for (let i = 0; i < 6; i++) {
        pass += todos[crypto.randomInt(0, todos.length)];
    }

    return pass.split('').sort(() => 0.5 - Math.random()).join('');
};

/**
 * Genera un código de radicado único para la solicitud
 */
const generarCodigoRadicado = (): string => {
    const anio = new Date().getFullYear();
    const aleatorio = crypto.randomInt(100000, 999999);
    return `SOL-${anio}-${aleatorio}`;
};

/**
 * Descompone un nombre completo en Nombres y Apellidos
 */
const descomponerNombre = (nombreCompleto: string): { nombres: string; apellidos: string } => {
    const partes = String(nombreCompleto || '').trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0) {
        return { nombres: 'Votante', apellidos: 'Registrado' };
    }
    if (partes.length === 1) {
        return { nombres: partes[0], apellidos: '' };
    }
    if (partes.length === 2) {
        return { nombres: partes[0], apellidos: partes[1] };
    }
    if (partes.length === 3) {
        return { nombres: partes[0], apellidos: `${partes[1]} ${partes[2]}` };
    }
    const mitad = Math.floor(partes.length / 2);
    return {
        nombres: partes.slice(0, mitad).join(' '),
        apellidos: partes.slice(mitad).join(' '),
    };
};

/**
 * Helper para registrar bitácora de auditoría en urnaDb
 */
const registrarAuditoria = async (accion: string, ejecutadoPor: string, req: Request, detalles: any) => {
    try {
        const ip = req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1';
        const userAgent = (req.headers['user-agent'] as string) || 'Desconocido';
        await urnaDb.from('logs_auditoria_admin').insert({
            accion,
            ejecutado_por: ejecutadoPor,
            ip_origen: ip,
            user_agent: userAgent,
            detalles,
        });
    } catch (err) {
        console.error('Error registrando log de auditoría solicitudes:', err);
    }
};

/**
 * 1. Crear Solicitud de Registro de Votante (Público)
 * Con los 5 campos estipulados y blindaje estricto anti-duplicados
 */
export const crearSolicitudRegistro = async (req: Request, res: Response): Promise<void> => {
    try {
        const { documento, nombreCompleto, correo, subdirectiva, telefono } = req.body;

        if (!documento || !nombreCompleto || !correo) {
            res.status(400).json({
                success: false,
                error: 'El documento de identidad, nombre completo y correo electrónico son obligatorios.',
            });
            return;
        }

        const docLimpio = validarDocumento(documento);
        const correoLimpio = String(correo).trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(correoLimpio)) {
            res.status(400).json({
                success: false,
                error: `El correo electrónico ingresado no tiene un formato válido: ${correoLimpio}`,
            });
            return;
        }

        const subdirectivaLimpia = subdirectiva ? String(subdirectiva).trim() : 'General';
        const telefonoLimpio = telefono ? String(telefono).trim() : '';

        // A. VALIDACIÓN ANTI-DUPLICADOS CONTRA EL CENSO OFICIAL
        const { data: votanteDocExistente } = await censoDb
            .from('votantes')
            .select('id_votante, documento_identidad, esta_habilitado')
            .eq('documento_identidad', docLimpio)
            .maybeSingle();

        if (votanteDocExistente) {
            res.status(409).json({
                success: false,
                error: 'Este documento de identidad ya se encuentra registrado y habilitado en el censo electoral oficial. Puede ingresar directamente al portal de votación.',
                codigoError: 'DOCUMENTO_YA_EN_CENSO',
            });
            return;
        }

        const { data: votanteCorreoExistente } = await censoDb
            .from('votantes')
            .select('id_votante, correo_institucional')
            .eq('correo_institucional', correoLimpio)
            .maybeSingle();

        if (votanteCorreoExistente) {
            res.status(409).json({
                success: false,
                error: 'El correo electrónico ingresado ya se encuentra registrado para otro elector en el censo oficial.',
                codigoError: 'CORREO_YA_EN_CENSO',
            });
            return;
        }

        // B. VALIDACIÓN ANTI-DUPLICADOS CONTRA SOLICITUDES PREVIAS
        const { data: solicitudDocExistente } = await censoDb
            .from('solicitudes_registro_votante')
            .select('id, codigo_radicado, estado, motivo_rechazo, creado_at')
            .eq('documento_identidad', docLimpio)
            .order('creado_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (solicitudDocExistente) {
            if (solicitudDocExistente.estado === 'PENDIENTE') {
                res.status(409).json({
                    success: false,
                    error: 'Ya existe una solicitud de inscripción en proceso de revisión para este documento de identidad. Puede consultar su estado en la pestaña "Consultar Radicado".',
                    estado: 'PENDIENTE',
                    codigoError: 'SOLICITUD_PENDIENTE_EXISTENTE',
                });
                return;
            }

            if (solicitudDocExistente.estado === 'APROBADA') {
                // Si la solicitud anterior figuraba APROBADA pero el votante ya no existe en el censo (fue eliminado previamente),
                // actualizamos la solicitud anterior a REVOCADA para mantener la trazabilidad histórica y permitir su nueva radicación.
                await censoDb
                    .from('solicitudes_registro_votante')
                    .update({
                        estado: 'REVOCADA',
                        motivo_rechazo: 'Inscripción previa revocada tras desvinculación del censo electoral oficial.',
                        actualizado_at: new Date().toISOString(),
                    })
                    .eq('id', solicitudDocExistente.id);
            }
        }

        const { data: solicitudCorreoExistente } = await censoDb
            .from('solicitudes_registro_votante')
            .select('id, codigo_radicado, estado')
            .eq('correo', correoLimpio)
            .eq('estado', 'PENDIENTE')
            .maybeSingle();

        if (solicitudCorreoExistente) {
            res.status(409).json({
                success: false,
                error: 'El correo electrónico ingresado ya cuenta con una solicitud de registro en trámite.',
                codigoError: 'CORREO_CON_SOLICITUD_PENDIENTE',
            });
            return;
        }

        // C. CREACIÓN DE LA SOLICITUD
        const { nombres, apellidos } = descomponerNombre(nombreCompleto);
        const codigoRadicado = generarCodigoRadicado();
        const ip = req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1';
        const userAgent = (req.headers['user-agent'] as string) || 'Desconocido';

        const nuevaSolicitud = {
            codigo_radicado: codigoRadicado,
            documento_identidad: docLimpio,
            nombres,
            apellidos,
            correo: correoLimpio,
            subdirectiva: subdirectivaLimpia,
            telefono: telefonoLimpio,
            estado: 'PENDIENTE',
            ip_origen: ip,
            user_agent: userAgent,
        };

        const { data: insertedData, error: insertError } = await censoDb
            .from('solicitudes_registro_votante')
            .insert([nuevaSolicitud])
            .select()
            .single();

        if (insertError) {
            console.error('Error insertando solicitud de registro:', insertError);
            throw new Error(`Error en base de datos al registrar la solicitud: ${insertError.message}`);
        }

        // Registrar auditoría de la solicitud radicada
        await registrarAuditoria('RADICACION_SOLICITUD_VOTANTE', `ELECTOR_${docLimpio}`, req, {
            codigo_radicado: codigoRadicado,
            documento: docLimpio,
            correo: correoLimpio,
            subdirectiva: subdirectivaLimpia,
        });

        res.status(201).json({
            success: true,
            mensaje: 'Solicitud de registro radicada exitosamente. Se encuentra pendiente de verificación y aprobación por el Tribunal Electoral / Auditoría.',
            radicado: codigoRadicado,
            solicitud: insertedData,
        });
    } catch (err: any) {
        console.error('Error en crearSolicitudRegistro:', err);
        res.status(500).json({
            success: false,
            error: err.message || 'Error al procesar la solicitud de registro del votante.',
        });
    }
};

/**
 * 2. Consultar Estado de Solicitud de Registro (Público)
 */
export const consultarEstadoSolicitud = async (req: Request, res: Response): Promise<void> => {
    try {
        const documentoRaw = req.params.documento || req.query.documento;
        if (!documentoRaw) {
            res.status(400).json({ success: false, error: 'Documento de identidad requerido.' });
            return;
        }

        const documento = validarDocumento(String(documentoRaw));

        // Verificar si ya está en el censo oficial
        const { data: enCenso } = await censoDb
            .from('votantes')
            .select('id_votante, documento_identidad, nombres, apellidos, esta_habilitado, ha_solicitado_token')
            .eq('documento_identidad', documento)
            .maybeSingle();

        // Obtener historial de solicitudes
        const { data: solicitudes, error } = await censoDb
            .from('solicitudes_registro_votante')
            .select('*')
            .eq('documento_identidad', documento)
            .order('creado_at', { ascending: false });

        if (error) throw error;

        const ultimaSolicitud = solicitudes && solicitudes.length > 0 ? solicitudes[0] : null;

        // Sanitización y enmascaramiento de datos personales (PII) para consulta pública
        const enmascararTexto = (txt: string): string => {
            if (!txt) return '';
            return txt.split(' ').map((p) => (p.length > 2 ? `${p[0]}••••${p[p.length - 1]}` : `${p[0]}•`)).join(' ');
        };

        const enmascararEmail = (email: string): string => {
            if (!email || !email.includes('@')) return '';
            const [user, domain] = email.split('@');
            const maskedUser = user.length > 3 ? `${user.slice(0, 2)}••••${user.slice(-1)}` : `${user[0]}••••`;
            return `${maskedUser}@${domain}`;
        };

        const solicitudSanitizada = ultimaSolicitud
            ? {
                id: ultimaSolicitud.id,
                codigo_radicado: ultimaSolicitud.codigo_radicado,
                documento_identidad: ultimaSolicitud.documento_identidad,
                nombres: enmascararTexto(ultimaSolicitud.nombres),
                apellidos: enmascararTexto(ultimaSolicitud.apellidos),
                correo: enmascararEmail(ultimaSolicitud.correo),
                subdirectiva: ultimaSolicitud.subdirectiva,
                telefono: ultimaSolicitud.telefono ? `••••${ultimaSolicitud.telefono.slice(-4)}` : '',
                estado: ultimaSolicitud.estado,
                motivo_rechazo: ultimaSolicitud.motivo_rechazo,
                creado_at: ultimaSolicitud.creado_at,
            }
            : null;

        res.json({
            success: true,
            documento,
            estaEnCenso: !!enCenso,
            datosCenso: enCenso
                ? {
                    habilitado: enCenso.esta_habilitado,
                    yaVoto: enCenso.ha_solicitado_token,
                    nombre: enmascararTexto(`${enCenso.nombres} ${enCenso.apellidos}`.trim()),
                }
                : null,
            solicitud: solicitudSanitizada,
        });
    } catch (err: any) {
        console.error('Error en consultarEstadoSolicitud:', err);
        res.status(500).json({
            success: false,
            error: err.message || 'Error al consultar el estado de la solicitud.',
        });
    }
};

/**
 * 3. Listar Solicitudes de Registro (ADMIN y AUDITOR)
 */
export const listarSolicitudes = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { estado, busqueda, limit = 100 } = req.query;

        let query = censoDb
            .from('solicitudes_registro_votante')
            .select('*')
            .order('creado_at', { ascending: false })
            .limit(Number(limit) || 100);

        if (estado && estado !== 'TODAS' && estado !== 'TODOS') {
            query = query.eq('estado', String(estado).toUpperCase());
        }

        const { data, error } = await query;
        if (error) throw error;

        let filtradas = data || [];
        if (busqueda && typeof busqueda === 'string' && busqueda.trim() !== '') {
            const termino = busqueda.trim().toLowerCase();
            filtradas = filtradas.filter(
                (s) =>
                    s.documento_identidad?.toLowerCase().includes(termino) ||
                    s.nombres?.toLowerCase().includes(termino) ||
                    s.apellidos?.toLowerCase().includes(termino) ||
                    s.correo?.toLowerCase().includes(termino) ||
                    s.codigo_radicado?.toLowerCase().includes(termino) ||
                    s.subdirectiva?.toLowerCase().includes(termino)
            );
        }

        // Estadísticas de conteo
        const { data: statsData } = await censoDb
            .from('solicitudes_registro_votante')
            .select('estado');

        const pendientesCount = (statsData || []).filter((s) => s.estado === 'PENDIENTE').length;
        const aprobadasCount = (statsData || []).filter((s) => s.estado === 'APROBADA').length;
        const rechazadasCount = (statsData || []).filter((s) => s.estado === 'RECHAZADA').length;
        const revocadasCount = (statsData || []).filter((s) => s.estado === 'REVOCADA').length;

        res.json({
            success: true,
            total: filtradas.length,
            metricas: {
                total: statsData?.length || 0,
                pendientes: pendientesCount,
                aprobadas: aprobadasCount,
                rechazadas: rechazadasCount,
                revocadas: revocadasCount,
            },
            solicitudes: filtradas,
        });
    } catch (err: any) {
        console.error('Error en listarSolicitudes:', err);
        res.status(500).json({
            success: false,
            error: err.message || 'Error al listar las solicitudes de registro.',
        });
    }
};

/**
 * 4. Aprobar Solicitud de Registro de Votante (ADMIN y AUDITOR)
 */
export const aprobarSolicitud = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { idSolicitud } = req.body;

        if (!idSolicitud) {
            res.status(400).json({ success: false, error: 'ID de solicitud requerido.' });
            return;
        }

        // Buscar solicitud
        const { data: solicitud, error: solError } = await censoDb
            .from('solicitudes_registro_votante')
            .select('*')
            .eq('id', idSolicitud)
            .maybeSingle();

        if (solError || !solicitud) {
            res.status(404).json({ success: false, error: 'Solicitud no encontrada.' });
            return;
        }

        if (solicitud.estado === 'APROBADA') {
            res.status(400).json({ success: false, error: 'Esta solicitud ya ha sido previamente aprobada.' });
            return;
        }

        const funcionarioNombre = req.usuario?.nombre || 'OFICIAL_ELECTORAL';
        const funcionarioRol = req.usuario?.rol || 'ADMIN';
        const docLimpio = solicitud.documento_identidad;
        const correoLimpio = solicitud.correo;
        const nombreCompleto = `${solicitud.nombres} ${solicitud.apellidos}`.trim();

        // 1. Generar contraseña segura y hash
        const passwordPlana = generarPasswordSegura();
        const password_hash = await bcrypt.hash(passwordPlana, 10);

        // 2. Dar de alta en el censo oficial `votantes`
        const { data: existenteVotante } = await censoDb
            .from('votantes')
            .select('id_votante')
            .eq('documento_identidad', docLimpio)
            .maybeSingle();

        if (existenteVotante) {
            const { error: updateVotError } = await censoDb
                .from('votantes')
                .update({
                    correo_institucional: correoLimpio,
                    nombres: solicitud.nombres,
                    apellidos: solicitud.apellidos,
                    password_hash,
                    esta_habilitado: true,
                    ha_solicitado_token: false,
                })
                .eq('id_votante', existenteVotante.id_votante);

            if (updateVotError) throw updateVotError;
        } else {
            const { error: insertVotError } = await censoDb
                .from('votantes')
                .insert([
                    {
                        documento_identidad: docLimpio,
                        correo_institucional: correoLimpio,
                        nombres: solicitud.nombres,
                        apellidos: solicitud.apellidos,
                        password_hash,
                        esta_habilitado: true,
                        ha_solicitado_token: false,
                        is_mfa_enabled: false,
                    },
                ]);

            if (insertVotError) throw insertVotError;
        }

        // 3. Actualizar estado de la solicitud
        const { error: updateSolError } = await censoDb
            .from('solicitudes_registro_votante')
            .update({
                estado: 'APROBADA',
                motivo_rechazo: null,
                revisado_por: funcionarioNombre,
                revisado_rol: funcionarioRol,
                revisado_at: new Date().toISOString(),
            })
            .eq('id', idSolicitud);

        if (updateSolError) throw updateSolError;

        // 4. Despachar correo electrónico privado con credenciales
        const emailResult = await enviarCredencialesVotante({
            documento: docLimpio,
            nombreCompleto,
            correo: correoLimpio,
            passwordPlana,
            subdirectiva: solicitud.subdirectiva,
            telefono: solicitud.telefono,
        });

        // 5. Registrar bitácora de auditoría
        await registrarAuditoria('APROBACION_SOLICITUD_VOTANTE', `${funcionarioRol}_${funcionarioNombre}`, req, {
            id_solicitud: idSolicitud,
            codigo_radicado: solicitud.codigo_radicado,
            documento: docLimpio,
            correo: correoLimpio,
            aprobado_por: funcionarioNombre,
            rol_aprobador: funcionarioRol,
            email_simulado: emailResult.simulado,
        });

        res.json({
            success: true,
            mensaje: `Solicitud ${solicitud.codigo_radicado} aprobada. Elector incorporado al censo y credenciales despachadas por correo.`,
            emailSimulado: emailResult.simulado,
        });
    } catch (err: any) {
        console.error('Error en aprobarSolicitud:', err);
        res.status(500).json({
            success: false,
            error: err.message || 'Error al aprobar la solicitud de registro.',
        });
    }
};

/**
 * 5. Rechazar Solicitud de Registro de Votante (ADMIN y AUDITOR)
 */
export const rechazarSolicitud = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { idSolicitud, motivo } = req.body;

        if (!idSolicitud) {
            res.status(400).json({ success: false, error: 'ID de solicitud requerido.' });
            return;
        }

        const motivoLimpio = motivo ? String(motivo).trim() : 'No cumple con los requisitos del censo electoral sindicado.';

        const { data: solicitud, error: solError } = await censoDb
            .from('solicitudes_registro_votante')
            .select('*')
            .eq('id', idSolicitud)
            .maybeSingle();

        if (solError || !solicitud) {
            res.status(404).json({ success: false, error: 'Solicitud no encontrada.' });
            return;
        }

        const funcionarioNombre = req.usuario?.nombre || 'OFICIAL_ELECTORAL';
        const funcionarioRol = req.usuario?.rol || 'ADMIN';

        const { error: updateError } = await censoDb
            .from('solicitudes_registro_votante')
            .update({
                estado: 'RECHAZADA',
                motivo_rechazo: motivoLimpio,
                revisado_por: funcionarioNombre,
                revisado_rol: funcionarioRol,
                revisado_at: new Date().toISOString(),
            })
            .eq('id', idSolicitud);

        if (updateError) throw updateError;

        // Auditoría
        await registrarAuditoria('RECHAZO_SOLICITUD_VOTANTE', `${funcionarioRol}_${funcionarioNombre}`, req, {
            id_solicitud: idSolicitud,
            codigo_radicado: solicitud.codigo_radicado,
            documento: solicitud.documento_identidad,
            motivo: motivoLimpio,
            rechazado_por: funcionarioNombre,
            rol_rechazador: funcionarioRol,
        });

        res.json({
            success: true,
            mensaje: `Solicitud ${solicitud.codigo_radicado} rechazada con éxito.`,
        });
    } catch (err: any) {
        console.error('Error en rechazarSolicitud:', err);
        res.status(500).json({
            success: false,
            error: err.message || 'Error al rechazar la solicitud de registro.',
        });
    }
};

/**
 * 6. Aprobación Masiva de Solicitudes de Registro (ADMIN y AUDITOR)
 */
export const aprobarSolicitudesMasivo = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { ids } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
            res.status(400).json({ success: false, error: 'Debe proporcionar una lista de IDs de solicitudes para procesar.' });
            return;
        }

        const funcionarioNombre = req.usuario?.nombre || 'OFICIAL_ELECTORAL';
        const funcionarioRol = req.usuario?.rol || 'ADMIN';

        const resultados = {
            total: ids.length,
            aprobadas: 0,
            fallidas: 0,
            correosEnviados: 0,
            correosSimulados: 0,
            detallesErrores: [] as Array<{ id: string; error: string }>,
        };

        for (const idSolicitud of ids) {
            try {
                const { data: solicitud, error: solError } = await censoDb
                    .from('solicitudes_registro_votante')
                    .select('*')
                    .eq('id', idSolicitud)
                    .maybeSingle();

                if (solError || !solicitud) {
                    resultados.fallidas++;
                    resultados.detallesErrores.push({ id: idSolicitud, error: 'Solicitud no encontrada.' });
                    continue;
                }

                if (solicitud.estado === 'APROBADA') {
                    resultados.aprobadas++;
                    continue;
                }

                const docLimpio = solicitud.documento_identidad;
                const correoLimpio = solicitud.correo;
                const nombreCompleto = `${solicitud.nombres} ${solicitud.apellidos}`.trim();

                const passwordPlana = generarPasswordSegura();
                const password_hash = await bcrypt.hash(passwordPlana, 10);

                // Upsert en votantes
                const { data: existente } = await censoDb
                    .from('votantes')
                    .select('id_votante')
                    .eq('documento_identidad', docLimpio)
                    .maybeSingle();

                if (existente) {
                    await censoDb
                        .from('votantes')
                        .update({
                            correo_institucional: correoLimpio,
                            nombres: solicitud.nombres,
                            apellidos: solicitud.apellidos,
                            password_hash,
                            esta_habilitado: true,
                            ha_solicitado_token: false,
                        })
                        .eq('id_votante', existente.id_votante);
                } else {
                    await censoDb
                        .from('votantes')
                        .insert([
                            {
                                documento_identidad: docLimpio,
                                correo_institucional: correoLimpio,
                                nombres: solicitud.nombres,
                                apellidos: solicitud.apellidos,
                                password_hash,
                                esta_habilitado: true,
                                ha_solicitado_token: false,
                                is_mfa_enabled: false,
                            },
                        ]);
                }

                // Actualizar estado solicitud
                await censoDb
                    .from('solicitudes_registro_votante')
                    .update({
                        estado: 'APROBADA',
                        motivo_rechazo: null,
                        revisado_por: funcionarioNombre,
                        revisado_rol: funcionarioRol,
                        revisado_at: new Date().toISOString(),
                    })
                    .eq('id', idSolicitud);

                // Despacho de correo
                const emailResult = await enviarCredencialesVotante({
                    documento: docLimpio,
                    nombreCompleto,
                    correo: correoLimpio,
                    passwordPlana,
                    subdirectiva: solicitud.subdirectiva,
                    telefono: solicitud.telefono,
                });

                if (emailResult.simulado) {
                    resultados.correosSimulados++;
                } else if (emailResult.success) {
                    resultados.correosEnviados++;
                }

                resultados.aprobadas++;
            } catch (errId: any) {
                resultados.fallidas++;
                resultados.detallesErrores.push({ id: idSolicitud, error: errId.message || 'Error procesando solicitud' });
            }
        }

        // Auditoría
        await registrarAuditoria('APROBACION_MASIVA_SOLICITUDES', `${funcionarioRol}_${funcionarioNombre}`, req, {
            total_solicitudes: resultados.total,
            aprobadas: resultados.aprobadas,
            fallidas: resultados.fallidas,
        });

        res.json({
            success: true,
            mensaje: `Procesamiento masivo completado: ${resultados.aprobadas} solicitudes aprobadas.`,
            resumen: resultados,
        });
    } catch (err: any) {
        console.error('Error en aprobarSolicitudesMasivo:', err);
        res.status(500).json({
            success: false,
            error: err.message || 'Error al procesar la aprobación masiva.',
        });
    }
};
