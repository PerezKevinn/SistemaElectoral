import { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { censoDb, urnaDb } from '../config/supabase';
import { AuthRequest } from '../middleware/authRole';
import { validarDocumento, validarEmail, validarTextoSeguro } from '../middleware/security';
import { enviarCredencialesVotante } from '../services/emailService';
import { obtenerTelemetriaDispositivo, esIpPrivada, sanitizarIp } from '../utils/telemetry';

// Helper para evitar bloqueo del Event Loop en procesos intensivos
const yieldEventLoop = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

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
 * Extrae una clasificación amigable y no invasiva del tipo de dispositivo
 * sin exponer la cadena técnica User-Agent completa (Privacidad por Diseño).
 */
export const clasificarDispositivoSeguro = (ua?: string | null): string => {
    if (!ua || ua === 'Desconocido') return '🌐 Navegador Web';
    const uaLower = ua.toLowerCase();

    if (uaLower.includes('android')) {
        return '📱 Celular / Móvil Android';
    }
    if (uaLower.includes('iphone')) {
        return '📱 Celular / iPhone (iOS)';
    }
    if (uaLower.includes('ipad')) {
        return '📱 Tablet iPad';
    }
    if (uaLower.includes('windows')) {
        return '💻 Computador Windows';
    }
    if (uaLower.includes('macintosh') || uaLower.includes('mac os')) {
        return '💻 Computador Mac (macOS)';
    }
    if (uaLower.includes('linux') && !uaLower.includes('android')) {
        return '💻 Computador Linux';
    }
    return '📱 Dispositivo Móvil / Web';
};

export interface AlertaSeguridadDispositivo {
    tieneAlerta: boolean;
    esMismoDispositivo: boolean;
    tipoCoincidencia: 'UUID_NAVEGADOR' | 'HUELLA_HARDWARE' | 'IP_Y_NAVEGADOR' | 'MISMA_RED_WIFI' | 'NINGUNA';
    nivelRiesgo: 'BAJO' | 'MEDIO' | 'ALTO';
    tipoDispositivo: string;
    totalCoincidencias: number;
    radicadosRelacionados: string[];
    subdirectivasInvolucradas: string[];
    hayDisparidadGeografica: boolean;
    mensajesAlerta: string[];
}

/**
 * Helper para registrar bitácora de auditoría en urnaDb
 */
const registrarAuditoria = async (accion: string, ejecutadoPor: string, req: Request, detalles: any) => {
    try {
        const { ip, userAgent, deviceId, deviceFingerprint } = obtenerTelemetriaDispositivo(req);
        await urnaDb.from('logs_auditoria_admin').insert({
            accion,
            ejecutado_por: ejecutadoPor,
            ip_origen: ip,
            user_agent: userAgent,
            detalles: {
                ...detalles,
                device_uuid: deviceId || detalles?.device_uuid || null,
                device_fingerprint: deviceFingerprint || detalles?.device_fingerprint || null,
            },
        });
    } catch (err) {
        console.error('Error registrando log de auditoría solicitudes:', err);
    }
};

/**
 * Estructura y control de estado del periodo de inscripciones al censo
 */
export interface EstadoInscripciones {
    abiertas: boolean;
    cerradoPor?: string | null;
    cerradoAt?: string | null;
    motivo?: string | null;
    ultimoCambioAt?: string | null;
}

let cachedEstadoInscripciones: EstadoInscripciones | null = null;
let lastCacheFetchTime = 0;
const CACHE_TTL_MS = 5000; // 5 segundos para sincronización ágil entre réplicas

export const obtenerEstadoInscripciones = async (forzarRefresco = false): Promise<EstadoInscripciones> => {
    const ahora = Date.now();
    if (!forzarRefresco && cachedEstadoInscripciones && (ahora - lastCacheFetchTime < CACHE_TTL_MS)) {
        return cachedEstadoInscripciones;
    }

    try {
        const { data: latestLog, error } = await urnaDb
            .from('logs_auditoria_admin')
            .select('accion, ejecutado_por, creado_at, detalles')
            .in('accion', ['CIERRE_INSCRIPCIONES', 'APERTURA_INSCRIPCIONES'])
            .order('creado_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('Error consultando estado de inscripciones en logs:', error);
            if (cachedEstadoInscripciones) return cachedEstadoInscripciones;
            return { abiertas: true };
        }

        if (!latestLog) {
            // Si nunca se ha registrado un evento, por defecto están abiertas
            cachedEstadoInscripciones = { abiertas: true };
        } else {
            const abiertas = latestLog.accion === 'APERTURA_INSCRIPCIONES';
            cachedEstadoInscripciones = {
                abiertas,
                cerradoPor: !abiertas ? (latestLog.ejecutado_por || 'Administración Electoral') : null,
                cerradoAt: !abiertas ? latestLog.creado_at : null,
                motivo: latestLog.detalles?.motivo || null,
                ultimoCambioAt: latestLog.creado_at,
            };
        }
    } catch (err) {
        console.error('Error obteniendo estado de inscripciones:', err);
        if (cachedEstadoInscripciones) return cachedEstadoInscripciones;
        cachedEstadoInscripciones = { abiertas: true };
    }

    lastCacheFetchTime = Date.now();
    return cachedEstadoInscripciones;
};

/**
 * Consulta pública del estado actual de las inscripciones (Abiertas / Cerradas)
 */
export const consultarEstadoInscripciones = async (req: Request, res: Response): Promise<void> => {
    try {
        const estado = await obtenerEstadoInscripciones();
        res.json({
            success: true,
            inscripcionesAbiertas: estado.abiertas,
            cerradoPor: estado.cerradoPor,
            cerradoAt: estado.cerradoAt,
            motivo: estado.motivo,
            ultimoCambioAt: estado.ultimoCambioAt,
        });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message || 'Error al obtener estado de inscripciones.' });
    }
};

/**
 * Cambiar estado de inscripciones (Abrir / Cerrar) por ADMIN o AUDITOR con auditoría completa
 */
export const cambiarEstadoInscripciones = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { abiertas, motivo } = req.body;
        if (typeof abiertas !== 'boolean') {
            res.status(400).json({ success: false, error: 'El campo "abiertas" booleano es obligatorio.' });
            return;
        }

        const ejecutadoPor = req.usuario?.nombre || req.usuario?.documento || req.usuario?.id || 'Administrador Electoral';
        const rolUsuario = req.usuario?.rol || 'ADMIN';
        const motivoLimpio = motivo ? String(motivo).trim() : (abiertas ? 'Reapertura oficial de inscripciones al censo' : 'Cierre oficial del periodo de registro al censo');

        const accion = abiertas ? 'APERTURA_INSCRIPCIONES' : 'CIERRE_INSCRIPCIONES';

        await registrarAuditoria(accion, ejecutadoPor, req, {
            inscripciones_abiertas: abiertas,
            motivo: motivoLimpio,
            rol_ejecutor: rolUsuario,
            fecha: new Date().toISOString(),
        });

        // Actualizar cache inmediatamente
        cachedEstadoInscripciones = {
            abiertas,
            cerradoPor: !abiertas ? ejecutadoPor : null,
            cerradoAt: !abiertas ? new Date().toISOString() : null,
            motivo: motivoLimpio,
            ultimoCambioAt: new Date().toISOString(),
        };
        lastCacheFetchTime = Date.now();

        res.json({
            success: true,
            inscripcionesAbiertas: abiertas,
            mensaje: abiertas
                ? 'Periodo de inscripciones abierto exitosamente. Ahora se reciben solicitudes de votantes.'
                : 'Periodo de inscripciones cerrado exitosamente. Se ha bloqueado la recepción de nuevas solicitudes.',
            detalles: cachedEstadoInscripciones,
        });
    } catch (err: any) {
        console.error('Error al cambiar estado de inscripciones:', err);
        res.status(500).json({ success: false, error: err.message || 'Error al actualizar el estado de las inscripciones.' });
    }
};

/**
 * 1. Crear Solicitud de Registro de Votante (Público)
 * Con los 5 campos estipulados y blindaje estricto anti-duplicados
 */
export const crearSolicitudRegistro = async (req: Request, res: Response): Promise<void> => {
    try {
        // 0. VERIFICACIÓN DE PERIODO DE INSCRIPCIONES (Abierto / Cerrado)
        const estadoInscripciones = await obtenerEstadoInscripciones();
        if (!estadoInscripciones.abiertas) {
            res.status(403).json({
                success: false,
                error: 'El periodo de inscripción y recepción de solicitudes ha sido cerrado oficialmente por el Tribunal Electoral y la Comisión de Auditoría. No se admiten nuevas solicitudes de registro.',
                codigoError: 'INSCRIPCIONES_CERRADAS',
                cerradoAt: estadoInscripciones.cerradoAt,
                motivo: estadoInscripciones.motivo,
            });
            return;
        }

        const { documento, nombreCompleto, correo, subdirectiva, telefono, aceptaTratamientoDatos } = req.body;

        if (!documento || !nombreCompleto || !correo) {
            res.status(400).json({
                success: false,
                error: 'El documento de identidad, nombre completo y correo electrónico son obligatorios.',
            });
            return;
        }

        if (aceptaTratamientoDatos === false) {
            res.status(400).json({
                success: false,
                error: 'Debe autorizar el tratamiento de sus datos personales y de filiación sindical para radicar la inscripción (Ley 1581 de 2012).',
            });
            return;
        }

        const docLimpio = validarDocumento(documento);
        const correoLimpio = validarEmail(correo);
        const nombreLimpio = validarTextoSeguro(nombreCompleto, 'Nombre Completo', 150);
        const subdirectivaLimpia = validarTextoSeguro(subdirectiva, 'Subdirectiva', 80) || 'General';
        const telefonoLimpio = validarTextoSeguro(telefono, 'Teléfono', 25);

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
                // actualizamos la solicitud anterior a REVOCADA (o RECHAZADA por fallback) para mantener la trazabilidad histórica y permitir su nueva radicación.
                let { error: errAutoRevoke } = await censoDb
                    .from('solicitudes_registro_votante')
                    .update({
                        estado: 'REVOCADA',
                        motivo_rechazo: 'Inscripción previa revocada tras desvinculación del censo electoral oficial.',
                        revisado_at: new Date().toISOString(),
                    })
                    .eq('id', solicitudDocExistente.id);

                if (errAutoRevoke) {
                    await censoDb
                        .from('solicitudes_registro_votante')
                        .update({
                            estado: 'RECHAZADA',
                            motivo_rechazo: 'Inscripción previa revocada tras desvinculación del censo electoral oficial.',
                            revisado_at: new Date().toISOString(),
                        })
                        .eq('id', solicitudDocExistente.id);
                }
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
        const { ip, userAgent, deviceId, deviceFingerprint } = obtenerTelemetriaDispositivo(req);

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

        // Registrar auditoría de la solicitud radicada con constancia de consentimiento Habeas Data y Telemetría
        await registrarAuditoria('RADICACION_SOLICITUD_VOTANTE', `ELECTOR_${docLimpio}`, req, {
            codigo_radicado: codigoRadicado,
            documento: docLimpio,
            correo: correoLimpio,
            subdirectiva: subdirectivaLimpia,
            autorizacion_datos_aceptada: true,
            marco_legal: 'Ley 1581 de 2012',
            device_uuid: deviceId,
            device_fingerprint: deviceFingerprint,
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

        // Auto-enriquecimiento de telemetría: si la solicitud histórica tenía la IP de proxy interna (10.24.0.151), actualizarla con la IP pública real y UUID
        if (ultimaSolicitud && (esIpPrivada(ultimaSolicitud.ip_origen || '') || !ultimaSolicitud.ip_origen)) {
            try {
                const { ip: ipActual, userAgent: uaActual, deviceId, deviceFingerprint } = obtenerTelemetriaDispositivo(req);
                if (ipActual && !esIpPrivada(ipActual)) {
                    censoDb
                        .from('solicitudes_registro_votante')
                        .update({
                            ip_origen: ipActual,
                            user_agent: uaActual || ultimaSolicitud.user_agent,
                        })
                        .eq('id', ultimaSolicitud.id)
                        .then(() => {});

                    registrarAuditoria('ACTUALIZACION_TELEMETRIA_CONSULTA', `ELECTOR_${documento}`, req, {
                        codigo_radicado: ultimaSolicitud.codigo_radicado,
                        device_uuid: deviceId,
                        device_fingerprint: deviceFingerprint,
                        ip_actualizada: ipActual,
                    }).catch(() => {});
                }
            } catch (telemetryErr) {
                // Silencioso para no interrumpir la consulta
            }
        }

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
 * Incluye correlación de seguridad no invasiva (Privacidad por Diseño)
 */
export const listarSolicitudes = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { estado, busqueda, limit = 200 } = req.query;

        // 1. Obtener todas las solicitudes registradas para correlación global
        const { data: todasSolicitudes, error: errorTodas } = await censoDb
            .from('solicitudes_registro_votante')
            .select('*')
            .order('creado_at', { ascending: false })
            .limit(1000);

        if (errorTodas) throw errorTodas;

        const solicitudesRaw = todasSolicitudes || [];

        // 2. Obtener bitácora de auditoría de radicación para complementar telemetría (UUID, Fingerprint, IP)
        const auditMap = new Map<string, { ip: string; ua: string; deviceId?: string | null; fingerprint?: string | null }>();
        try {
            const { data: auditLogs } = await urnaDb
                .from('logs_auditoria_admin')
                .select('ejecutado_por, ip_origen, user_agent, detalles')
                .eq('accion', 'RADICACION_SOLICITUD_VOTANTE')
                .limit(1000);

            if (auditLogs) {
                for (const log of auditLogs) {
                    const doc = log.ejecutado_por ? String(log.ejecutado_por).replace('ELECTOR_', '') : '';
                    const radicado = log.detalles?.codigo_radicado;
                    const ip = log.ip_origen || '';
                    const ua = log.user_agent || '';
                    const devId = log.detalles?.device_uuid || null;
                    const fp = log.detalles?.device_fingerprint || null;
                    const payload = { ip, ua, deviceId: devId, fingerprint: fp };
                    if (doc) auditMap.set(doc, payload);
                    if (radicado) auditMap.set(radicado, payload);
                }
            }
        } catch (auditErr) {
            console.warn('Advertencia obteniendo logs de auditoría para correlación:', auditErr);
        }

        // 3. Normalizar telemetría de cada solicitud
        const solicitudesConTelemetria = solicitudesRaw.map((s: any) => {
            const auditInfo = auditMap.get(s.codigo_radicado) || auditMap.get(s.documento_identidad);
            const ip = sanitizarIp((s.ip_origen || auditInfo?.ip || '').trim());
            const ua = (s.user_agent || auditInfo?.ua || '').trim();
            const deviceId = auditInfo?.deviceId || null;
            const fingerprint = auditInfo?.fingerprint || null;
            return {
                ...s,
                _ip: ip,
                _ua: ua,
                _deviceId: deviceId,
                _fingerprint: fingerprint,
            };
        });

        // 4. Agrupaciones inteligentes:
        // A. Por Device UUID persistente (Almacenamiento navegador)
        // B. Por Device Fingerprint (Huella de Hardware / Canvas / WebGL)
        // C. Por IP pública + User Agent (Fallback)
        // D. Por IP pública (Misma red WiFi / LAN compartida)
        const gruposDeviceId = new Map<string, any[]>();
        const gruposFingerprint = new Map<string, any[]>();
        const gruposIpUa = new Map<string, any[]>();
        const gruposRed = new Map<string, any[]>();

        for (const s of solicitudesConTelemetria) {
            if (s._deviceId) {
                const list = gruposDeviceId.get(s._deviceId) || [];
                list.push(s);
                gruposDeviceId.set(s._deviceId, list);
            }

            if (s._fingerprint) {
                const list = gruposFingerprint.get(s._fingerprint) || [];
                list.push(s);
                gruposFingerprint.set(s._fingerprint, list);
            }

            if (s._ip && s._ip !== '127.0.0.1' && !esIpPrivada(s._ip)) {
                const keyIpUa = `${s._ip}_###_${s._ua}`;
                const listIpUa = gruposIpUa.get(keyIpUa) || [];
                listIpUa.push(s);
                gruposIpUa.set(keyIpUa, listIpUa);

                const listRed = gruposRed.get(s._ip) || [];
                listRed.push(s);
                gruposRed.set(s._ip, listRed);
            }
        }

        // 5. Enriquecer cada solicitud con su análisis de seguridad no invasivo
        const solicitudesEnriquecidas = solicitudesConTelemetria.map((s: any) => {
            let grupoRef: any[] = [];
            let tipoCoincidencia: 'UUID_NAVEGADOR' | 'HUELLA_HARDWARE' | 'IP_Y_NAVEGADOR' | 'MISMA_RED_WIFI' | 'NINGUNA' = 'NINGUNA';
            let esMismoDispositivo = false;

            if (s._deviceId && (gruposDeviceId.get(s._deviceId)?.length || 0) > 1) {
                grupoRef = gruposDeviceId.get(s._deviceId)!;
                tipoCoincidencia = 'UUID_NAVEGADOR';
                esMismoDispositivo = true;
            } else if (s._fingerprint && (gruposFingerprint.get(s._fingerprint)?.length || 0) > 1) {
                grupoRef = gruposFingerprint.get(s._fingerprint)!;
                tipoCoincidencia = 'HUELLA_HARDWARE';
                esMismoDispositivo = true;
            } else if (s._ip && !esIpPrivada(s._ip) && (gruposIpUa.get(`${s._ip}_###_${s._ua}`)?.length || 0) > 1) {
                grupoRef = gruposIpUa.get(`${s._ip}_###_${s._ua}`)!;
                tipoCoincidencia = 'IP_Y_NAVEGADOR';
                esMismoDispositivo = true;
            } else if (s._ip && !esIpPrivada(s._ip) && (gruposRed.get(s._ip)?.length || 0) > 1) {
                grupoRef = gruposRed.get(s._ip)!;
                tipoCoincidencia = 'MISMA_RED_WIFI';
                esMismoDispositivo = false; // Misma red WiFi pero dispositivos físicos diferentes
            }

            const tieneCoincidencias = grupoRef.length > 1;
            let nivelRiesgo: 'BAJO' | 'MEDIO' | 'ALTO' = 'BAJO';
            const tipoDispositivo = clasificarDispositivoSeguro(s._ua);
            let radicadosRelacionados: string[] = [];
            let subdirectivasInvolucradas: string[] = [];
            let hayDisparidadGeografica = false;
            const mensajesAlerta: string[] = [];

            if (tieneCoincidencias) {
                radicadosRelacionados = Array.from(new Set(grupoRef.map((g: any) => g.codigo_radicado)));
                subdirectivasInvolucradas = Array.from(
                    new Set(grupoRef.map((g: any) => g.subdirectiva || 'General').filter(Boolean))
                );
                hayDisparidadGeografica = subdirectivasInvolucradas.length > 1;

                if (esMismoDispositivo) {
                    nivelRiesgo = hayDisparidadGeografica || grupoRef.length >= 3 ? 'ALTO' : 'MEDIO';
                    if (tipoCoincidencia === 'UUID_NAVEGADOR') {
                        mensajesAlerta.push(
                            `${grupoRef.length} solicitudes radicadas desde el mismo navegador web (UUID de almacenamiento coincidente).`
                        );
                    } else if (tipoCoincidencia === 'HUELLA_HARDWARE') {
                        mensajesAlerta.push(
                            `${grupoRef.length} solicitudes radicadas desde el mismo equipo/celular físico (${tipoDispositivo} - Huella digital de hardware coincidente).`
                        );
                    } else {
                        mensajesAlerta.push(
                            `${grupoRef.length} solicitudes radicadas desde el mismo dispositivo (${tipoDispositivo}).`
                        );
                    }
                } else {
                    // Misma red Wi-Fi compartida pero con dispositivos físicos distintos:
                    // Es un comportamiento legítimo y esperado en sedes sindicales u oficinas.
                    nivelRiesgo = hayDisparidadGeografica ? 'MEDIO' : 'BAJO';
                    mensajesAlerta.push(
                        `${grupoRef.length} solicitudes radicadas desde la misma red Wi-Fi / IP pública pero desde equipos físicos individuales (Dispositivos diferentes).`
                    );
                }

                if (hayDisparidadGeografica) {
                    mensajesAlerta.push(
                        `⚠️ Discrepancia geográfica: Solicitudes pertenecen a subdirectivas distintas (${subdirectivasInvolucradas.join(
                            ', '
                        )}).`
                    );
                }
            }

            // Solo activar alerta de revisión si es el MISMO dispositivo físico o si existe discrepancia geográfica
            const tieneAlerta = esMismoDispositivo || (tieneCoincidencias && hayDisparidadGeografica);

            // Ocultar datos de telemetría crudos del objeto retornado (Protección de Datos / Privacidad)
            const { _ip, _ua, _deviceId, _fingerprint, ...resto } = s;

            return {
                ...resto,
                alerta_seguridad: {
                    tieneAlerta,
                    esMismoDispositivo,
                    tipoCoincidencia,
                    nivelRiesgo,
                    tipoDispositivo,
                    totalCoincidencias: grupoRef.length > 1 ? grupoRef.length : 1,
                    radicadosRelacionados,
                    subdirectivasInvolucradas,
                    hayDisparidadGeografica,
                    mensajesAlerta,
                } as AlertaSeguridadDispositivo,
            };
        });

        // 6. Aplicar filtros
        let filtradas = solicitudesEnriquecidas;

        if (estado && estado !== 'TODAS' && estado !== 'TODOS') {
            const estUpper = String(estado).toUpperCase();
            if (estUpper === 'CON_ALERTAS' || estUpper === 'ALERTAS') {
                filtradas = filtradas.filter((s) => s.alerta_seguridad?.tieneAlerta);
            } else {
                filtradas = filtradas.filter((s) => s.estado === estUpper);
            }
        }

        if (busqueda && typeof busqueda === 'string' && busqueda.trim() !== '') {
            const termino = busqueda.trim().toLowerCase();
            filtradas = filtradas.filter(
                (s) =>
                    s.documento_identidad?.toLowerCase().includes(termino) ||
                    s.nombres?.toLowerCase().includes(termino) ||
                    s.apellidos?.toLowerCase().includes(termino) ||
                    s.correo?.toLowerCase().includes(termino) ||
                    s.codigo_radicado?.toLowerCase().includes(termino) ||
                    s.subdirectiva?.toLowerCase().includes(termino) ||
                    s.alerta_seguridad?.radicadosRelacionados?.some((r: string) => r.toLowerCase().includes(termino))
            );
        }

        // 7. Estadísticas de conteo
        const pendientesCount = solicitudesEnriquecidas.filter((s) => s.estado === 'PENDIENTE').length;
        const aprobadasCount = solicitudesEnriquecidas.filter((s) => s.estado === 'APROBADA').length;
        const rechazadasCount = solicitudesEnriquecidas.filter((s) => s.estado === 'RECHAZADA').length;
        const revocadasCount = solicitudesEnriquecidas.filter((s) => s.estado === 'REVOCADA').length;
        const conAlertasCount = solicitudesEnriquecidas.filter((s) => s.alerta_seguridad?.tieneAlerta).length;
        const estadoInscripciones = await obtenerEstadoInscripciones();

        res.json({
            success: true,
            total: filtradas.length,
            estadoInscripciones: {
                abiertas: estadoInscripciones.abiertas,
                cerradoPor: estadoInscripciones.cerradoPor,
                cerradoAt: estadoInscripciones.cerradoAt,
                motivo: estadoInscripciones.motivo,
                ultimoCambioAt: estadoInscripciones.ultimoCambioAt,
            },
            metricas: {
                total: solicitudesEnriquecidas.length,
                pendientes: pendientesCount,
                aprobadas: aprobadasCount,
                rechazadas: rechazadasCount,
                revocadas: revocadasCount,
                conAlertas: conAlertasCount,
            },
            solicitudes: filtradas.slice(0, Number(limit) || 200),
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

        if (ids.length > 100) {
            res.status(400).json({ success: false, error: 'Por seguridad del servidor, el límite máximo por lote es de 100 solicitudes.' });
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

        for (let i = 0; i < ids.length; i++) {
            if (i > 0 && i % 3 === 0) {
                await yieldEventLoop();
            }
            const idSolicitud = ids[i];
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
