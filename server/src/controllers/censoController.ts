import { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { censoDb, urnaDb } from '../config/supabase';
import { AuthRequest } from '../middleware/authRole';
import { validarDocumento, validarEmail, validarTextoSeguro } from '../middleware/security';
import { enviarCredencialesVotante, verificarEstadoSmtp, VotanteEmailData } from '../services/emailService';

// Helper para evitar bloqueo del Event Loop en procesos intensivos de CPU
const yieldEventLoop = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

/**
 * Genera una contraseña aleatoria de alta entropía (10 caracteres)
 */
const generarPasswordSegura = (): string => {
    const charsMayus = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const charsMinus = 'abcdefghjkmnpqrstuvwxyz';
    const charsNum = '23456789';
    const charsEspeciales = '#$%&*+@!';

    // Garantizar al menos uno de cada tipo
    let pass = '';
    pass += charsMayus[crypto.randomInt(0, charsMayus.length)];
    pass += charsMinus[crypto.randomInt(0, charsMinus.length)];
    pass += charsNum[crypto.randomInt(0, charsNum.length)];
    pass += charsEspeciales[crypto.randomInt(0, charsEspeciales.length)];

    const todos = charsMayus + charsMinus + charsNum + charsEspeciales;
    for (let i = 0; i < 6; i++) {
        pass += todos[crypto.randomInt(0, todos.length)];
    }

    // Mezclar caracteres
    return pass.split('').sort(() => 0.5 - Math.random()).join('');
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
    // 4 o más palabras (ej: Juan Carlos Perez Gomez)
    const mitad = Math.floor(partes.length / 2);
    return {
        nombres: partes.slice(0, mitad).join(' '),
        apellidos: partes.slice(mitad).join(' '),
    };
};

/**
 * Helper para registrar bitácora de auditoría
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
        console.error('Error registrando log de auditoría censo:', err);
    }
};

/**
 * 1. Carga masiva de censo electoral desde archivo Excel / JSON
 * Blindada contra CPU Starvation y bloqueos de I/O mediante procesamiento en lotes asíncrono
 */
export const cargarCensoMasivo = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { votantes } = req.body;

        if (!Array.isArray(votantes) || votantes.length === 0) {
            res.status(400).json({
                success: false,
                error: 'Debe proporcionar una lista de votantes para procesar el censo.',
            });
            return;
        }

        if (votantes.length > 500) {
            res.status(400).json({
                success: false,
                error: 'Por motivos de rendimiento y estabilidad del servidor, el límite máximo por lote es de 500 registros. Por favor subdivida el archivo.',
            });
            return;
        }

        const resultados = {
            totalProcesados: votantes.length,
            exitosos: 0,
            fallidos: 0,
            correosEnviados: 0,
            correosSimulados: 0,
            detallesErrores: [] as Array<{ fila: number; documento?: string; error: string }>,
        };

        for (let idx = 0; idx < votantes.length; idx++) {
            // Ceder control al Event Loop cada 5 iteraciones para evitar congelar Express
            if (idx > 0 && idx % 5 === 0) {
                await yieldEventLoop();
            }

            const row = votantes[idx];
            const numFila = idx + 1;

            try {
                const docRaw = row.documento || row.identificacion || row.cedula || row['No. Identificación'] || '';
                const nombreRaw = row.nombreCompleto || row.nombre || row['Nombre Completo'] || '';
                const correoRaw = row.correo || row.email || row['Correo electrónico'] || row['Correo electronico'] || '';
                const subdirectivaRaw = row.subdirectiva || row['Subdirectiva'] || row.seccional || 'General';
                const telefonoRaw = row.telefono || row['Télefono'] || row['Telefono'] || '';

                if (!docRaw || !correoRaw) {
                    resultados.fallidos++;
                    resultados.detallesErrores.push({
                        fila: numFila,
                        documento: String(docRaw),
                        error: 'Documento de identidad y Correo electrónico son obligatorios.',
                    });
                    continue;
                }

                const documento = validarDocumento(docRaw);
                const correo = validarEmail(correoRaw);
                const nombreSanitizado = validarTextoSeguro(nombreRaw, 'Nombre Completo', 150);
                const subdirectivaSanitizada = validarTextoSeguro(subdirectivaRaw, 'Subdirectiva', 80) || 'General';
                const telefonoSanitizado = validarTextoSeguro(telefonoRaw, 'Teléfono', 25);

                const { nombres, apellidos } = descomponerNombre(nombreSanitizado);
                const passwordPlana = generarPasswordSegura();
                const password_hash = await bcrypt.hash(passwordPlana, 10);

                // Upsert en la base de datos del censo
                const { data: existente } = await censoDb
                    .from('votantes')
                    .select('id_votante')
                    .eq('documento_identidad', documento)
                    .maybeSingle();

                if (existente) {
                    // Actualizar credencial y habilitar
                    const { error: updateErr } = await censoDb
                        .from('votantes')
                        .update({
                            correo_institucional: correo,
                            nombres,
                            apellidos,
                            password_hash,
                            esta_habilitado: true,
                            ha_solicitado_token: false,
                        })
                        .eq('id_votante', existente.id_votante);

                    if (updateErr) throw updateErr;
                } else {
                    // Insertar nuevo votante
                    const { error: insertErr } = await censoDb
                        .from('votantes')
                        .insert([
                            {
                                documento_identidad: documento,
                                correo_institucional: correo,
                                nombres,
                                apellidos,
                                password_hash,
                                esta_habilitado: true,
                                ha_solicitado_token: false,
                                is_mfa_enabled: false,
                            },
                        ]);

                    if (insertErr) throw insertErr;
                }

                // Despachar correo electrónico privado al elector
                const emailResult = await enviarCredencialesVotante({
                    documento,
                    nombreCompleto: nombreSanitizado || `${nombres} ${apellidos}`,
                    correo,
                    passwordPlana,
                    subdirectiva: subdirectivaSanitizada,
                    telefono: telefonoSanitizado,
                });

                if (emailResult.simulado) {
                    resultados.correosSimulados++;
                } else if (emailResult.success) {
                    resultados.correosEnviados++;
                }

                resultados.exitosos++;
            } catch (errRow: any) {
                resultados.fallidos++;
                resultados.detallesErrores.push({
                    fila: numFila,
                    error: errRow.message || 'Error procesando registro',
                });
            }
        }

        // Auditoría
        await registrarAuditoria(
            'CARGA_MASIVA_CENSO',
            req.usuario?.nombre || 'ADMIN_OFICIAL',
            req,
            {
                total_procesados: resultados.totalProcesados,
                exitosos: resultados.exitosos,
                fallidos: resultados.fallidos,
                correos_enviados: resultados.correosEnviados,
                correos_simulados: resultados.correosSimulados,
            }
        );

        res.json({
            success: true,
            mensaje: `Censo procesado: ${resultados.exitosos} votantes registrados/actualizados.`,
            resumen: resultados,
        });
    } catch (err: any) {
        console.error('Error en cargarCensoMasivo:', err);
        res.status(500).json({
            success: false,
            error: err.message || 'Error durante la carga masiva del censo.',
        });
    }
};

/**
 * 2. Registrar un votante individual
 */
export const registrarVotanteIndividual = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { documento, nombreCompleto, correo, subdirectiva, telefono } = req.body;

        if (!documento || !nombreCompleto || !correo) {
            res.status(400).json({
                success: false,
                error: 'Documento, Nombre Completo y Correo electrónico son obligatorios.',
            });
            return;
        }

        const docLimpio = validarDocumento(documento);
        const correoLimpio = String(correo).trim().toLowerCase();
        const { nombres, apellidos } = descomponerNombre(nombreCompleto);

        const passwordPlana = generarPasswordSegura();
        const password_hash = await bcrypt.hash(passwordPlana, 10);

        const { data: existente } = await censoDb
            .from('votantes')
            .select('id_votante')
            .eq('documento_identidad', docLimpio)
            .maybeSingle();

        if (existente) {
            res.status(400).json({
                success: false,
                error: `Ya existe un elector registrado con el documento ${docLimpio}.`,
            });
            return;
        }

        const { data: existenteCorreo } = await censoDb
            .from('votantes')
            .select('id_votante')
            .eq('correo_institucional', correoLimpio)
            .maybeSingle();

        if (existenteCorreo) {
            res.status(400).json({
                success: false,
                error: `El correo "${correoLimpio}" ya se encuentra registrado para otro elector en el censo.`,
            });
            return;
        }

        const { error: insertErr } = await censoDb
            .from('votantes')
            .insert([
                {
                    documento_identidad: docLimpio,
                    correo_institucional: correoLimpio,
                    nombres,
                    apellidos,
                    password_hash,
                    esta_habilitado: true,
                    ha_solicitado_token: false,
                    is_mfa_enabled: false,
                },
            ]);

        if (insertErr) throw insertErr;

        // Despachar correo privado
        const emailResult = await enviarCredencialesVotante({
            documento: docLimpio,
            nombreCompleto: String(nombreCompleto).trim(),
            correo: correoLimpio,
            passwordPlana,
            subdirectiva: subdirectiva ? String(subdirectiva).trim() : undefined,
            telefono: telefono ? String(telefono).trim() : undefined,
        });

        await registrarAuditoria(
            'REGISTRO_INDIVIDUAL_VOTANTE',
            req.usuario?.nombre || 'ADMIN_OFICIAL',
            req,
            { documento: docLimpio, correo: correoLimpio, nombre: nombreCompleto }
        );

        if (!emailResult.success && !emailResult.simulado) {
            res.status(502).json({
                success: false,
                error: `Elector guardado en censo, pero el servidor de correo falló al enviar: ${emailResult.error}`,
            });
            return;
        }

        res.json({
            success: true,
            mensaje: 'Votante registrado y credenciales despachadas por correo.',
            emailSimulado: emailResult.simulado,
        });
    } catch (err: any) {
        console.error('Error en registrarVotanteIndividual:', err);
        res.status(500).json({
            success: false,
            error: err.message || 'Error al registrar votante.',
        });
    }
};

/**
 * 3. Listar votantes del censo (Sin exponer password_hash ni mfa_secret)
 */
export const listarVotantesCenso = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { busqueda, estado, limit = 100 } = req.query;

        let query = censoDb
            .from('votantes')
            .select('id_votante, documento_identidad, correo_institucional, nombres, apellidos, esta_habilitado, ha_solicitado_token, is_mfa_enabled, token_emitido_at, creado_at')
            .order('creado_at', { ascending: false })
            .limit(Number(limit) || 100);

        if (estado === 'HABILITADOS') {
            query = query.eq('esta_habilitado', true);
        } else if (estado === 'INHABILITADOS') {
            query = query.eq('esta_habilitado', false);
        } else if (estado === 'VOTARON') {
            query = query.eq('ha_solicitado_token', true);
        } else if (estado === 'PENDIENTES') {
            query = query.eq('ha_solicitado_token', false);
        }

        const { data, error } = await query;

        if (error) throw error;

        let filtrados = data || [];
        if (busqueda && typeof busqueda === 'string' && busqueda.trim() !== '') {
            const termino = busqueda.trim().toLowerCase();
            filtrados = filtrados.filter((v) =>
                v.documento_identidad?.toLowerCase().includes(termino) ||
                v.nombres?.toLowerCase().includes(termino) ||
                v.apellidos?.toLowerCase().includes(termino) ||
                v.correo_institucional?.toLowerCase().includes(termino)
            );
        }

        res.json({
            success: true,
            total: filtrados.length,
            votantes: filtrados,
        });
    } catch (err: any) {
        console.error('Error en listarVotantesCenso:', err);
        res.status(500).json({
            success: false,
            error: err.message || 'Error al obtener lista del censo electoral.',
        });
    }
};

/**
 * 4. Reenviar credenciales privadas a un votante (Regenera contraseña y envía por correo)
 */
export const reenviarCredencialesVotante = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { idVotante, documento } = req.body;

        if (!idVotante && !documento) {
            res.status(400).json({ success: false, error: 'ID de votante o documento requerido.' });
            return;
        }

        let query = censoDb.from('votantes').select('*');
        if (idVotante) {
            query = query.eq('id_votante', idVotante);
        } else {
            query = query.eq('documento_identidad', validarDocumento(documento));
        }

        const { data: votante, error } = await query.maybeSingle();

        if (error || !votante) {
            res.status(404).json({ success: false, error: 'Votante no encontrado en el censo electoral.' });
            return;
        }

        if (votante.ha_solicitado_token) {
            res.status(400).json({
                success: false,
                error: 'No se pueden reenviar credenciales a un elector que ya ejerció el voto en esta jornada.',
            });
            return;
        }

        const nuevaPassword = generarPasswordSegura();
        const password_hash = await bcrypt.hash(nuevaPassword, 10);

        const { error: updateErr } = await censoDb
            .from('votantes')
            .update({ password_hash, esta_habilitado: true })
            .eq('id_votante', votante.id_votante);

        if (updateErr) throw updateErr;

        const emailResult = await enviarCredencialesVotante({
            documento: votante.documento_identidad,
            nombreCompleto: `${votante.nombres} ${votante.apellidos}`.trim(),
            correo: votante.correo_institucional,
            passwordPlana: nuevaPassword,
        });

        await registrarAuditoria(
            'REENVIO_CREDENCIALES_VOTANTE',
            req.usuario?.nombre || 'ADMIN_OFICIAL',
            req,
            { documento: votante.documento_identidad, correo: votante.correo_institucional }
        );

        if (!emailResult.success && !emailResult.simulado) {
            res.status(502).json({
                success: false,
                error: `Nueva clave guardada, pero el servidor de correo falló al enviar: ${emailResult.error}`,
            });
            return;
        }

        res.json({
            success: true,
            mensaje: `Nuevas credenciales generadas y despachadas exitosamente a ${votante.correo_institucional}`,
            emailSimulado: emailResult.simulado,
        });
    } catch (err: any) {
        console.error('Error en reenviarCredencialesVotante:', err);
        res.status(500).json({
            success: false,
            error: err.message || 'Error al reenviar credenciales.',
        });
    }
};

/**
 * 5. Alternar estado de habilitación de un votante
 */
export const cambiarEstadoHabilitacion = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { idVotante, habilitado } = req.body;

        if (!idVotante || typeof habilitado !== 'boolean') {
            res.status(400).json({ success: false, error: 'ID de votante y nuevo estado requeridos.' });
            return;
        }

        const { data, error } = await censoDb
            .from('votantes')
            .update({ esta_habilitado: habilitado })
            .eq('id_votante', idVotante)
            .select('id_votante, documento_identidad, nombres, apellidos, esta_habilitado')
            .single();

        if (error || !data) throw error || new Error('Votante no encontrado');

        await registrarAuditoria(
            'CAMBIO_HABILITACION_VOTANTE',
            req.usuario?.nombre || 'ADMIN_OFICIAL',
            req,
            { documento: data.documento_identidad, nuevo_estado: habilitado }
        );

        res.json({
            success: true,
            mensaje: `Votante ${habilitado ? 'habilitado' : 'inhabilitado'} exitosamente.`,
            votante: data,
        });
    } catch (err: any) {
        console.error('Error en cambiarEstadoHabilitacion:', err);
        res.status(500).json({
            success: false,
            error: err.message || 'Error al cambiar estado de habilitación.',
        });
    }
};

/**
 * 6. Consultar estado y conectividad del servidor SMTP
 */
export const obtenerEstadoSmtp = async (_req: Request, res: Response): Promise<void> => {
    try {
        const estado = await verificarEstadoSmtp();
        res.json({ success: true, estado });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message || 'Error al consultar estado SMTP' });
    }
};

/**
 * 7. Eliminar votante del censo electoral (Solo ADMIN)
 * Registra todos los detalles del votante y el motivo en la bitácora de auditoría inmutable
 */
export const eliminarVotante = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const idVotante = req.body.idVotante || req.body.id || req.params.id;
        const motivo = (req.body.motivo || 'Eliminación administrativa de elector del censo electoral').toString().trim();

        if (!idVotante) {
            res.status(400).json({ success: false, error: 'ID de votante requerido.' });
            return;
        }

        // Obtener la información completa del votante antes de eliminarlo para la auditoría
        const { data: votante, error: queryError } = await censoDb
            .from('votantes')
            .select('*')
            .eq('id_votante', idVotante)
            .maybeSingle();

        if (queryError || !votante) {
            res.status(404).json({ success: false, error: 'Votante no encontrado en el censo electoral.' });
            return;
        }

        // Proceder a eliminar de la base de datos del censo
        const { error: deleteError } = await censoDb
            .from('votantes')
            .delete()
            .eq('id_votante', idVotante);

        if (deleteError) throw deleteError;

        // Trazabilidad total: Actualizar solicitudes de registro previas asociadas a este documento a 'REVOCADA'
        const adminNombre = req.usuario?.nombre || 'ADMIN_OFICIAL';
        const adminRol = req.usuario?.rol || 'ADMIN';
        let solicitudesRevocadasCount = 0;

        try {
            const { data: solicitudesPrevias, error: errSolQuery } = await censoDb
                .from('solicitudes_registro_votante')
                .select('id, codigo_radicado, estado')
                .eq('documento_identidad', votante.documento_identidad);

            if (!errSolQuery && solicitudesPrevias && solicitudesPrevias.length > 0) {
                let { error: errSolUpdate } = await censoDb
                    .from('solicitudes_registro_votante')
                    .update({
                        estado: 'REVOCADA',
                        motivo_rechazo: `Inscripción revocada por eliminación del elector en el censo electoral oficial. Motivo: ${motivo}`,
                        revisado_por: adminNombre,
                        revisado_rol: adminRol,
                        revisado_at: new Date().toISOString(),
                    })
                    .eq('documento_identidad', votante.documento_identidad);

                if (errSolUpdate) {
                    // Fallback a RECHAZADA si la base de datos tiene la restricción CHECK antigua
                    const fallbackRes = await censoDb
                        .from('solicitudes_registro_votante')
                        .update({
                            estado: 'RECHAZADA',
                            motivo_rechazo: `Inscripción revocada por eliminación del elector en el censo electoral oficial. Motivo: ${motivo}`,
                            revisado_por: adminNombre,
                            revisado_rol: adminRol,
                            revisado_at: new Date().toISOString(),
                        })
                        .eq('documento_identidad', votante.documento_identidad);

                    if (!fallbackRes.error) {
                        solicitudesRevocadasCount = solicitudesPrevias.length;
                    }
                } else {
                    solicitudesRevocadasCount = solicitudesPrevias.length;
                }
            }
        } catch (errSol) {
            console.error('Advertencia al revocar solicitudes asociadas al votante:', errSol);
        }

        // Registrar exhaustivamente en la bitácora de auditoría
        await registrarAuditoria(
            'ELIMINACION_VOTANTE',
            `${adminRol}_${adminNombre}`,
            req,
            {
                id_votante_eliminado: votante.id_votante,
                documento_identidad: votante.documento_identidad,
                nombre_completo: `${votante.nombres} ${votante.apellidos}`.trim(),
                correo_institucional: votante.correo_institucional,
                estado_habilitado: votante.esta_habilitado,
                habia_votado: votante.ha_solicitado_token,
                motivo_eliminacion: motivo,
                solicitudes_revocadas_asociadas: solicitudesRevocadasCount,
                eliminado_por: adminNombre,
                rol_ejecutor: adminRol,
                fecha_registro_original: votante.creado_at,
            }
        );

        res.json({
            success: true,
            mensaje: `Elector ${votante.nombres} ${votante.apellidos} (Doc: ${votante.documento_identidad}) eliminado del censo. Solicitudes vinculadas revocadas (${solicitudesRevocadasCount}). Evento registrado en bitácora.`,
            votanteEliminado: {
                id_votante: votante.id_votante,
                documento_identidad: votante.documento_identidad,
                nombre: `${votante.nombres} ${votante.apellidos}`.trim(),
            },
            solicitudesRevocadas: solicitudesRevocadasCount,
        });
    } catch (err: any) {
        console.error('Error en eliminarVotante:', err);
        res.status(500).json({
            success: false,
            error: err.message || 'Error al eliminar elector del censo.',
        });
    }
};
