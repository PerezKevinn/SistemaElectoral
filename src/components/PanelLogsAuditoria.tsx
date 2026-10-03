import React, { useEffect, useState, useMemo } from 'react';
import {
    History,
    Clock,
    User,
    ArrowLeft,
    RefreshCw,
    ShieldCheck,
    Lock,
    PlayCircle,
    UserCheck,
    KeyRound,
    CheckCircle2,
    UserX,
    Search,
    X,
    Copy,
    Check,
    Filter,
    FileSpreadsheet,
    UserPlus,
    Globe,
} from 'lucide-react';
import { useToast } from './Toast';

interface LogAuditoria {
    id_log: string;
    accion: string;
    ejecutado_por: string;
    ejecutado_por_nombre?: string;
    cargo_usuario?: string | null;
    rol_usuario?: string | null;
    ip_origen?: string | null;
    user_agent?: string | null;
    detalles: any;
    creado_at: string;
}

interface PanelLogsAuditoriaProps {
    eleccionId: string;
    onVolver: () => void;
}

type CategoriaLog = 'TODOS' | 'JORNADA' | 'STAFF' | 'VOTANTES' | 'SEGURIDAD';

const ACCIONES_INFO: Record<
    string,
    {
        titulo: string;
        descripcion: string;
        badgeClass: string;
        borderClass: string;
        icon: React.FC<{ className?: string }>;
        categoria: CategoriaLog;
    }
> = {
    APERTURA_JORNADA: {
        titulo: 'Apertura de Jornada Electoral',
        descripcion: 'Se inició oficialmente la jornada para recibir los sufragios de los electores.',
        badgeClass: 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300',
        borderClass: 'hover:border-cyan-500/40',
        icon: PlayCircle,
        categoria: 'JORNADA',
    },
    CIERRE_JORNADA: {
        titulo: 'Cierre y Sellado de Urna',
        descripcion: 'Se clausuró la votación y se selló digitalmente la urna de forma definitiva e inmutable.',
        badgeClass: 'bg-rose-950/80 border-rose-500/50 text-rose-300',
        borderClass: 'hover:border-rose-500/40',
        icon: Lock,
        categoria: 'JORNADA',
    },
    CREAR_ELECCION: {
        titulo: 'Creación de Elección',
        descripcion: 'Se configuró una nueva jornada electoral con sus planchas oficiales.',
        badgeClass: 'bg-purple-950/80 border-purple-500/50 text-purple-300',
        borderClass: 'hover:border-purple-500/40',
        icon: ShieldCheck,
        categoria: 'JORNADA',
    },
    CREACION_USUARIO_STAFF: {
        titulo: 'Registro de Funcionario',
        descripcion: 'Se registró un nuevo miembro institucional para la administración electoral.',
        badgeClass: 'bg-indigo-950/80 border-indigo-500/50 text-indigo-300',
        borderClass: 'hover:border-indigo-500/40',
        icon: UserCheck,
        categoria: 'STAFF',
    },
    ACTIVACION_USUARIO_STAFF: {
        titulo: 'Habilitación de Funcionario',
        descripcion: 'Se activó el acceso institucional para el funcionario electoral.',
        badgeClass: 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300',
        borderClass: 'hover:border-emerald-500/40',
        icon: CheckCircle2,
        categoria: 'STAFF',
    },
    DESACTIVACION_USUARIO_STAFF: {
        titulo: 'Suspensión de Funcionario',
        descripcion: 'Se inhabilitó el acceso institucional para el funcionario electoral.',
        badgeClass: 'bg-rose-950/80 border-rose-500/50 text-rose-300',
        borderClass: 'hover:border-rose-500/40',
        icon: UserX,
        categoria: 'STAFF',
    },
    RESTABLECIMIENTO_PASSWORD_STAFF: {
        titulo: 'Cambio de Contraseña Staff',
        descripcion: 'Se actualizó la credencial del funcionario con cifrado seguro.',
        badgeClass: 'bg-amber-950/80 border-amber-500/50 text-amber-300',
        borderClass: 'hover:border-amber-500/40',
        icon: KeyRound,
        categoria: 'SEGURIDAD',
    },
    ELIMINACION_USUARIO_STAFF: {
        titulo: 'Eliminación de Funcionario',
        descripcion: 'Se revocó y eliminó la cuenta del funcionario del sistema electoral.',
        badgeClass: 'bg-rose-950/80 border-rose-500/50 text-rose-300',
        borderClass: 'hover:border-rose-500/40',
        icon: UserX,
        categoria: 'STAFF',
    },
    SOLICITUD_RECUPERACION_PASSWORD_AUTOSERVICIO: {
        titulo: 'Solicitud de Recuperación de Clave',
        descripcion: 'Un usuario solicitó restablecimiento de credenciales mediante autoservicio.',
        badgeClass: 'bg-amber-950/80 border-amber-500/50 text-amber-300',
        borderClass: 'hover:border-amber-500/40',
        icon: KeyRound,
        categoria: 'SEGURIDAD',
    },
    CAMBIO_PASSWORD_AUTOSERVICIO: {
        titulo: 'Contraseña Restablecida con Éxito',
        descripcion: 'El usuario completó la actualización de su clave tras validación de seguridad.',
        badgeClass: 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300',
        borderClass: 'hover:border-emerald-500/40',
        icon: CheckCircle2,
        categoria: 'SEGURIDAD',
    },
    APROBACION_SOLICITUD_VOTANTE: {
        titulo: 'Aprobación de Registro de Votante',
        descripcion: 'Se validó y aprobó la solicitud de inscripción de un nuevo elector.',
        badgeClass: 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300',
        borderClass: 'hover:border-emerald-500/40',
        icon: UserCheck,
        categoria: 'VOTANTES',
    },
    RECHAZO_SOLICITUD_VOTANTE: {
        titulo: 'Rechazo de Solicitud de Votante',
        descripcion: 'Se denegó la solicitud de registro del elector por inconsistencias.',
        badgeClass: 'bg-rose-950/80 border-rose-500/50 text-rose-300',
        borderClass: 'hover:border-rose-500/40',
        icon: UserX,
        categoria: 'VOTANTES',
    },
    SOLICITUD_REGISTRO_VOTANTE: {
        titulo: 'Nueva Solicitud de Inscripción',
        descripcion: 'Un elector envió una solicitud digital para incorporarse al censo.',
        badgeClass: 'bg-sky-950/80 border-sky-500/50 text-sky-300',
        borderClass: 'hover:border-sky-500/40',
        icon: UserPlus,
        categoria: 'VOTANTES',
    },
    IMPORTACION_CENSO_MASIVO: {
        titulo: 'Importación Masiva de Censo',
        descripcion: 'Carga masiva de electores al padrón electoral desde archivo oficial.',
        badgeClass: 'bg-violet-950/80 border-violet-500/50 text-violet-300',
        borderClass: 'hover:border-violet-500/40',
        icon: FileSpreadsheet,
        categoria: 'VOTANTES',
    },
    CREACION_VOTANTE_INDIVIDUAL: {
        titulo: 'Registro Individual de Votante',
        descripcion: 'Se incorporó manualmente un nuevo elector al padrón institucional.',
        badgeClass: 'bg-blue-950/80 border-blue-500/50 text-blue-300',
        borderClass: 'hover:border-blue-500/40',
        icon: UserPlus,
        categoria: 'VOTANTES',
    },
    ELIMINACION_VOTANTE_CENSO: {
        titulo: 'Retiro de Elector del Padrón',
        descripcion: 'Se retiró un elector del padrón electoral con justificación de auditoría.',
        badgeClass: 'bg-rose-950/80 border-rose-500/50 text-rose-300',
        borderClass: 'hover:border-rose-500/40',
        icon: UserX,
        categoria: 'VOTANTES',
    },
    REESTABLECER_INTENTOS_MFA: {
        titulo: 'Desbloqueo de Intentos MFA',
        descripcion: 'Se restableció el contador de intentos fallidos de autenticación en dos pasos.',
        badgeClass: 'bg-orange-950/80 border-orange-500/50 text-orange-300',
        borderClass: 'hover:border-orange-500/40',
        icon: KeyRound,
        categoria: 'SEGURIDAD',
    },
    CIERRE_INSCRIPCIONES: {
        titulo: 'Cierre de Inscripciones al Censo',
        descripcion: 'Se clausuró la recepción de solicitudes públicas de registro al censo electoral.',
        badgeClass: 'bg-rose-950/80 border-rose-500/50 text-rose-300',
        borderClass: 'hover:border-rose-500/40',
        icon: Lock,
        categoria: 'VOTANTES',
    },
    APERTURA_INSCRIPCIONES: {
        titulo: 'Apertura de Inscripciones al Censo',
        descripcion: 'Se habilitó la recepción pública de solicitudes de registro al censo electoral.',
        badgeClass: 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300',
        borderClass: 'hover:border-emerald-500/40',
        icon: UserPlus,
        categoria: 'VOTANTES',
    },
    EXPORTACION_CENSO: {
        titulo: 'Exportación de Censo Electoral',
        descripcion: 'Descarga y exportación oficial del padrón de votantes a archivo Excel / CSV.',
        badgeClass: 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300',
        borderClass: 'hover:border-emerald-500/40',
        icon: FileSpreadsheet,
        categoria: 'VOTANTES',
    },
};

const DICCIONARIO_CLAVES: Record<
    string,
    { label: string; isMonospace?: boolean; isFullWidth?: boolean }
> = {
    inscripciones_abiertas: { label: 'Inscripciones Abiertas' },
    motivo: { label: 'Motivo / Justificación', isFullWidth: true },
    rol_ejecutor: { label: 'Rol del Ejecutor' },
    documento: { label: 'Documento de Identidad' },
    documento_identidad: { label: 'Documento de Identidad' },
    correo: { label: 'Correo Electrónico' },
    correo_destino: { label: 'Correo Destino' },
    correoDestino: { label: 'Correo Destino' },
    email_simulado: { label: 'Email Simulado' },
    emailSimulado: { label: 'Email Simulado' },
    device_uuid: { label: 'Device UUID', isMonospace: true },
    deviceUuid: { label: 'Device UUID', isMonospace: true },
    device_fingerprint: { label: 'Device Fingerprint', isMonospace: true, isFullWidth: true },
    deviceFingerprint: { label: 'Device Fingerprint', isMonospace: true, isFullWidth: true },
    ip_origen: { label: 'Dirección IP', isMonospace: true },
    ipOrigen: { label: 'Dirección IP', isMonospace: true },
    user_agent: { label: 'Navegador / Dispositivo', isFullWidth: true },
    userAgent: { label: 'Navegador / Dispositivo', isFullWidth: true },
    rol: { label: 'Rol Asignado' },
    cargo: { label: 'Cargo Institucional' },
    nombre: { label: 'Nombre' },
    nombres: { label: 'Nombres' },
    apellidos: { label: 'Apellidos' },
    funcionario_creado: { label: 'Funcionario Creado' },
    funcionario_afectado: { label: 'Funcionario Afectado' },
    funcionario: { label: 'Funcionario' },
    nuevo_estado: { label: 'Nuevo Estado' },
    nuevoEstado: { label: 'Nuevo Estado' },
    estadoPrevio: { label: 'Estado Previo' },
    candidatosHabilitados: { label: 'Candidaturas' },
    totalVotosSellados: { label: 'Total Votos' },
    observaciones: { label: 'Observaciones', isFullWidth: true },
    subdirectiva: { label: 'Subdirectiva' },
    telefono: { label: 'Teléfono' },
    id_solicitud: { label: 'ID Solicitud', isMonospace: true },
    id_votante: { label: 'ID Votante', isMonospace: true },
    id_eleccion: { label: 'ID Elección', isMonospace: true },
    total_registros: { label: 'Total Registros' },
    total_exportados: { label: 'Total Votantes Exportados' },
    formato: { label: 'Formato de Exportación' },
    filtro_estado: { label: 'Filtro de Estado' },
    busqueda_aplicada: { label: 'Criterio de Búsqueda' },
    registros_exitosos: { label: 'Registros Exitosos' },
    registros_fallidos: { label: 'Registros Fallidos' },
    aprobado_por: { label: 'Aprobado Por' },
};

export const PanelLogsAuditoria: React.FC<PanelLogsAuditoriaProps> = ({ eleccionId, onVolver }) => {
    const toast = useToast();
    const [logs, setLogs] = useState<LogAuditoria[]>([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<CategoriaLog>('TODOS');
    const [copiadoId, setCopiadoId] = useState<string | null>(null);

    const cargarLogs = async () => {
        setLoading(true);
        try {
            const token = sessionStorage.getItem('staff_token');
            const url = eleccionId ? `/api/urna/logs?eleccionId=${eleccionId}` : '/api/urna/logs';
            const res = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            });

            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setLogs(data.logs || []);
                }
            }
        } catch (err) {
            console.error('Error al cargar logs:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarLogs();
    }, [eleccionId]);

    const getInfoAccion = (accion: string) => {
        if (ACCIONES_INFO[accion]) {
            return ACCIONES_INFO[accion];
        }

        // Categorización por coincidencia inteligente de nombre
        let cat: CategoriaLog = 'TODOS';
        if (accion.includes('JORNADA') || accion.includes('ELECCION') || accion.includes('URNA')) cat = 'JORNADA';
        else if (accion.includes('STAFF') || accion.includes('FUNCIONARIO')) cat = 'STAFF';
        else if (accion.includes('VOTANTE') || accion.includes('CENSO') || accion.includes('SOLICITUD')) cat = 'VOTANTES';
        else if (accion.includes('PASSWORD') || accion.includes('CLAVE') || accion.includes('MFA') || accion.includes('AUTH')) cat = 'SEGURIDAD';

        return {
            titulo: accion.replace(/_/g, ' '),
            descripcion: 'Evento administrativo registrado en la bitácora institucional.',
            badgeClass: 'bg-slate-900 border-slate-700 text-slate-300',
            borderClass: 'hover:border-slate-700',
            icon: History,
            categoria: cat,
        };
    };

    const getNombreUsuario = (log: LogAuditoria): { nombre: string; cargo?: string } => {
        if (log.ejecutado_por_nombre) {
            return {
                nombre: log.ejecutado_por_nombre,
                cargo: log.cargo_usuario || undefined,
            };
        }

        const ejecutado = String(log.ejecutado_por || '').trim();
        if (ejecutado === 'ADMIN_OFICIAL' || ejecutado === 'ADMIN' || !ejecutado) {
            return { nombre: 'Administrador General', cargo: 'Mesa Directiva' };
        }

        // Si es un UUID largo sin resolver, mostrar Administrador Autorizado
        if (ejecutado.length > 20 && /^[0-9a-fA-F-]+$/.test(ejecutado)) {
            return { nombre: 'Administrador General', cargo: 'Personal Autorizado' };
        }

        return { nombre: ejecutado, cargo: log.cargo_usuario || undefined };
    };

    const copiarAlPortapapeles = async (texto: string, id: string, label: string = 'Dato') => {
        try {
            await navigator.clipboard.writeText(texto);
            setCopiadoId(id);
            toast?.success(`${label} copiado al portapapeles.`, 'Copiado');
            setTimeout(() => {
                setCopiadoId((prev) => (prev === id ? null : prev));
            }, 2500);
        } catch {
            toast?.error('No se pudo copiar el texto.', 'Error');
        }
    };

    const traducirClave = (key: string) => {
        if (DICCIONARIO_CLAVES[key]) {
            return DICCIONARIO_CLAVES[key].label;
        }
        return key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();
    };

    // Filtro dinámico inteligente
    const logsFiltrados = useMemo(() => {
        const query = busqueda.trim().toLowerCase();

        return logs.filter((log) => {
            const info = getInfoAccion(log.accion);

            // 1. Filtro por categoría
            if (categoriaSeleccionada !== 'TODOS' && info.categoria !== categoriaSeleccionada) {
                return false;
            }

            // 2. Filtro por texto de búsqueda
            if (!query) return true;

            const userInfo = getNombreUsuario(log);
            const fechaStr = new Date(log.creado_at).toLocaleString().toLowerCase();

            // Buscar en campos directos del log
            const matchDirecto =
                log.accion.toLowerCase().includes(query) ||
                info.titulo.toLowerCase().includes(query) ||
                info.descripcion.toLowerCase().includes(query) ||
                (log.ejecutado_por && log.ejecutado_por.toLowerCase().includes(query)) ||
                userInfo.nombre.toLowerCase().includes(query) ||
                (userInfo.cargo && userInfo.cargo.toLowerCase().includes(query)) ||
                (log.rol_usuario && log.rol_usuario.toLowerCase().includes(query)) ||
                (log.ip_origen && log.ip_origen.toLowerCase().includes(query)) ||
                (log.user_agent && log.user_agent.toLowerCase().includes(query)) ||
                fechaStr.includes(query);

            if (matchDirecto) return true;

            // Buscar dentro del objeto de detalles recursivamente
            if (log.detalles && typeof log.detalles === 'object') {
                const detallesString = JSON.stringify(log.detalles).toLowerCase();
                if (detallesString.includes(query)) return true;
            }

            return false;
        });
    }, [logs, busqueda, categoriaSeleccionada]);

    // Contadores por categoría para insignias
    const conteos = useMemo(() => {
        const counts: Record<CategoriaLog, number> = {
            TODOS: logs.length,
            JORNADA: 0,
            STAFF: 0,
            VOTANTES: 0,
            SEGURIDAD: 0,
        };

        logs.forEach((log) => {
            const info = getInfoAccion(log.accion);
            if (counts[info.categoria] !== undefined) {
                counts[info.categoria]++;
            }
        });

        return counts;
    }, [logs]);

    const renderDetallesAmigables = (log: LogAuditoria) => {
        const { accion, detalles, id_log } = log;
        if (!detalles || typeof detalles !== 'object') return null;

        // 1. Apertura de jornada
        if (accion === 'APERTURA_JORNADA') {
            return (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs w-full min-w-0">
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 min-w-0 overflow-hidden">
                        <span className="text-slate-400 block text-[11px] mb-1 font-medium truncate">Estado de la Urna</span>
                        <div className="flex items-center gap-1.5 text-emerald-400 font-semibold min-w-0">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                            <span className="truncate">Abierta para Votación</span>
                        </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 min-w-0 overflow-hidden">
                        <span className="text-slate-400 block text-[11px] mb-1 font-medium truncate">Opciones / Planchas</span>
                        <span className="font-bold text-white font-mono text-sm block truncate">
                            {detalles.candidatosHabilitados || 0} candidaturas habilitadas
                        </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 min-w-0 overflow-hidden">
                        <span className="text-slate-400 block text-[11px] mb-1 font-medium truncate">Verificación Técnica</span>
                        <span className="text-slate-200 font-medium block truncate">Cadena inicial en cero (0)</span>
                    </div>
                </div>
            );
        }

        // 2. Cierre de jornada
        if (accion === 'CIERRE_JORNADA') {
            return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs w-full min-w-0">
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 min-w-0 overflow-hidden">
                        <span className="text-slate-400 block text-[11px] mb-1 font-medium truncate">Total de Votos Custodiados</span>
                        <span className="font-bold text-white font-mono text-sm block truncate">
                            {detalles.totalVotosSellados ?? 0} sufragios emitidos
                        </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 min-w-0 overflow-hidden">
                        <span className="text-slate-400 block text-[11px] mb-1 font-medium truncate">Sello de Seguridad</span>
                        <span className="font-semibold text-cyan-300 block truncate">Urna sellada definitivamente</span>
                    </div>
                </div>
            );
        }

        // 3. Creación de personal staff
        if (accion === 'CREACION_USUARIO_STAFF') {
            return (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs w-full min-w-0">
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 min-w-0 overflow-hidden">
                        <span className="text-slate-400 block text-[11px] mb-1 font-medium truncate">Funcionario Registrado</span>
                        <span className="font-semibold text-white block break-words">{detalles.funcionario_creado || 'N/A'}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 min-w-0 overflow-hidden">
                        <span className="text-slate-400 block text-[11px] mb-1 font-medium truncate">Rol Asignado</span>
                        <span className="font-semibold text-indigo-300 block break-words">{detalles.rol || 'N/A'}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 min-w-0 overflow-hidden">
                        <span className="text-slate-400 block text-[11px] mb-1 font-medium truncate">Documento de Identidad</span>
                        <span className="font-mono text-slate-200 block break-all">{detalles.documento || 'N/A'}</span>
                    </div>
                </div>
            );
        }

        // 4. Activación / Desactivación de personal
        if (accion === 'ACTIVACION_USUARIO_STAFF' || accion === 'DESACTIVACION_USUARIO_STAFF') {
            const esActivo = detalles.nuevo_estado === 'ACTIVO' || accion === 'ACTIVACION_USUARIO_STAFF';
            return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs w-full min-w-0">
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 min-w-0 overflow-hidden">
                        <span className="text-slate-400 block text-[11px] mb-1 font-medium truncate">Funcionario</span>
                        <span className="font-semibold text-white block break-words">{detalles.funcionario_afectado || 'N/A'}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 min-w-0 overflow-hidden">
                        <span className="text-slate-400 block text-[11px] mb-1 font-medium truncate">Estado de la Cuenta</span>
                        <span className={`font-bold block break-words ${esActivo ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {esActivo ? 'Cuenta Activa y Habilitada' : 'Cuenta Suspendida'}
                        </span>
                    </div>
                </div>
            );
        }

        // 5. Cambio de contraseña
        if (accion === 'RESTABLECIMIENTO_PASSWORD_STAFF') {
            return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs w-full min-w-0">
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 min-w-0 overflow-hidden">
                        <span className="text-slate-400 block text-[11px] mb-1 font-medium truncate">Funcionario</span>
                        <span className="font-semibold text-white block break-words">{detalles.funcionario || 'N/A'}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 min-w-0 overflow-hidden">
                        <span className="text-slate-400 block text-[11px] mb-1 font-medium truncate">Resultado de Seguridad</span>
                        <span className="font-semibold text-amber-300 block break-words">Contraseña Actualizada con Éxito</span>
                    </div>
                </div>
            );
        }

        // 6. Formateador inteligente y robusto para todos los eventos
        const entries = Object.entries(detalles).filter(
            ([k, v]) => v !== undefined && v !== null && k !== 'selloFinalHash'
        );
        if (entries.length === 0) return null;

        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1 text-xs w-full min-w-0">
                {entries.map(([k, v]) => {
                    const infoClave = DICCIONARIO_CLAVES[k];
                    const label = infoClave ? infoClave.label : traducirClave(k);
                    const valorString = typeof v === 'object' ? JSON.stringify(v) : String(v);
                    const isMonospace =
                        infoClave?.isMonospace ||
                        k.toLowerCase().includes('hash') ||
                        k.toLowerCase().includes('token') ||
                        k.toLowerCase().includes('fingerprint') ||
                        k.toLowerCase().includes('uuid') ||
                        k.toLowerCase().includes('ip');

                    const isLongTechnical =
                        isMonospace ||
                        valorString.length > 28 ||
                        /^[0-9a-fA-F-]{20,}$/.test(valorString.trim());

                    const isFullWidth =
                        infoClave?.isFullWidth ||
                        k.toLowerCase().includes('fingerprint') ||
                        k.toLowerCase().includes('user_agent') ||
                        k.toLowerCase().includes('useragent') ||
                        valorString.length > 45;

                    const uniqueCopyKey = `${id_log}-${k}`;

                    return (
                        <div
                            key={k}
                            className={`p-3 rounded-xl bg-slate-900/90 border border-slate-800/90 min-w-0 overflow-hidden flex flex-col justify-between group transition hover:border-slate-700 ${
                                isFullWidth ? 'col-span-1 sm:col-span-2 md:col-span-3' : ''
                            }`}
                        >
                            <div className="flex items-center justify-between gap-1.5 mb-1.5 min-w-0">
                                <span className="text-slate-400 block text-[11px] font-medium truncate" title={label}>
                                    {label}
                                </span>
                                {isLongTechnical && (
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            copiarAlPortapapeles(valorString, uniqueCopyKey, label);
                                        }}
                                        className="text-slate-500 hover:text-cyan-400 hover:bg-slate-800/80 p-1 rounded-md transition flex items-center gap-1 shrink-0 text-[10px]"
                                        title={`Copiar ${label}`}
                                    >
                                        {copiadoId === uniqueCopyKey ? (
                                            <>
                                                <Check className="w-3 h-3 text-emerald-400" />
                                                <span className="text-emerald-400 text-[10px] font-medium">Copiado</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-3 h-3" />
                                                <span className="text-[10px] hidden sm:inline">Copiar</span>
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>

                            <div className="min-w-0">
                                {typeof v === 'boolean' ? (
                                    <span
                                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                            v
                                                ? 'bg-emerald-950/70 border border-emerald-800/60 text-emerald-300'
                                                : 'bg-slate-950/70 border border-slate-800 text-slate-400'
                                        }`}
                                    >
                                        <span className={`w-1.5 h-1.5 rounded-full ${v ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                                        {v ? 'Sí' : 'No'}
                                    </span>
                                ) : isLongTechnical ? (
                                    <div className="p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 min-w-0">
                                        <span className="font-mono text-[11px] text-cyan-300/90 break-all leading-relaxed select-all block">
                                            {valorString}
                                        </span>
                                    </div>
                                ) : k.toLowerCase().includes('correo') || k.toLowerCase().includes('email') ? (
                                    <span className="font-mono text-xs text-sky-300 font-medium break-all block">
                                        {valorString}
                                    </span>
                                ) : (
                                    <span className="font-semibold text-slate-200 text-xs break-words block">
                                        {valorString}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="w-full max-w-5xl mx-auto glass-panel p-4 sm:p-6 lg:p-8 rounded-2xl shadow-2xl space-y-6 overflow-hidden">
            {/* Header del Panel */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-5 gap-4">
                <div className="flex items-center space-x-3 min-w-0">
                    <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 shadow-md shadow-amber-950/40 shrink-0">
                        <History className="w-6 h-6" />
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight truncate">
                            Bitácora de Eventos y Auditoría
                        </h2>
                        <p className="text-xs text-slate-400 truncate">
                            Registro inmutable de actividades, seguridad y gestión electoral
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={cargarLogs}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 rounded-xl transition text-xs font-semibold cursor-pointer disabled:opacity-50"
                        title="Recargar eventos"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
                        <span>Actualizar</span>
                    </button>
                    <button
                        onClick={onVolver}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium rounded-xl transition cursor-pointer"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Volver</span>
                    </button>
                </div>
            </div>

            {/* Barra de Búsqueda Dinámica y Filtros por Categoría */}
            <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between bg-slate-950/70 p-2.5 sm:p-3 rounded-xl border border-slate-800/90 shadow-inner">
                    {/* Campo de búsqueda */}
                    <div className="relative flex-1 min-w-0">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            type="text"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            placeholder="Buscar por usuario, documento, email, acción, IP, huella..."
                            className="w-full pl-10 pr-9 py-2 bg-slate-900/90 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-400 outline-none focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/30 transition shadow-inner"
                        />
                        {busqueda && (
                            <button
                                onClick={() => setBusqueda('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5 rounded transition"
                                title="Limpiar búsqueda"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Resumen de resultados */}
                    <div className="flex items-center justify-between sm:justify-end gap-2 text-xs text-slate-400 px-1 shrink-0">
                        <span className="font-medium">
                            Mostrando <strong className="text-white font-mono">{logsFiltrados.length}</strong> de <strong className="text-slate-300 font-mono">{logs.length}</strong>
                        </span>
                        {(busqueda || categoriaSeleccionada !== 'TODOS') && (
                            <button
                                onClick={() => {
                                    setBusqueda('');
                                    setCategoriaSeleccionada('TODOS');
                                }}
                                className="text-[11px] text-amber-400 hover:text-amber-300 hover:underline cursor-pointer ml-1"
                            >
                                Limpiar filtros
                            </button>
                        )}
                    </div>
                </div>

                {/* Filtros de Categoría Rápidos */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs pt-0.5">
                    <span className="text-[11px] text-slate-500 font-medium mr-1 flex items-center gap-1">
                        <Filter className="w-3 h-3" /> Categoría:
                    </span>
                    {(
                        [
                            { id: 'TODOS', label: 'Todos', count: conteos.TODOS },
                            { id: 'JORNADA', label: 'Jornada y Urna', count: conteos.JORNADA },
                            { id: 'STAFF', label: 'Personal Staff', count: conteos.STAFF },
                            { id: 'VOTANTES', label: 'Votantes y Censo', count: conteos.VOTANTES },
                            { id: 'SEGURIDAD', label: 'Seguridad y Claves', count: conteos.SEGURIDAD },
                        ] as const
                    ).map((cat) => {
                        const activo = categoriaSeleccionada === cat.id;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => setCategoriaSeleccionada(cat.id)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer flex items-center gap-1.5 border ${
                                    activo
                                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm shadow-amber-950/30'
                                        : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-800'
                                }`}
                            >
                                <span>{cat.label}</span>
                                <span
                                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                                        activo
                                            ? 'bg-amber-500/30 text-amber-200'
                                            : 'bg-slate-800 text-slate-500'
                                    }`}
                                >
                                    {cat.count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Listado de Eventos */}
            {loading ? (
                <div className="text-center py-16 text-slate-400 text-xs space-y-3 bg-slate-950/40 border border-slate-800/60 rounded-2xl">
                    <RefreshCw className="w-7 h-7 animate-spin mx-auto text-amber-400" />
                    <p className="font-medium text-slate-300">Consultando bitácora de auditoría inmutable...</p>
                </div>
            ) : logs.length === 0 ? (
                <div className="text-center py-14 bg-slate-950/40 border border-slate-800/80 rounded-2xl text-slate-500 text-xs space-y-2">
                    <History className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="font-semibold text-slate-400 text-sm">Sin registros de auditoría</p>
                    <p className="text-slate-500">No hay eventos registrados en la bitácora todavía.</p>
                </div>
            ) : logsFiltrados.length === 0 ? (
                <div className="text-center py-14 bg-slate-950/40 border border-slate-800/80 rounded-2xl text-slate-400 text-xs space-y-3">
                    <Search className="w-8 h-8 text-slate-600 mx-auto" />
                    <p className="font-semibold text-slate-200 text-sm">
                        No se encontraron eventos coincidentes
                    </p>
                    <p className="text-slate-400 max-w-sm mx-auto">
                        No hay registros que coincidan con la búsqueda actual{' '}
                        {busqueda && <span className="text-amber-400 font-mono">"{busqueda}"</span>}.
                    </p>
                    <button
                        onClick={() => {
                            setBusqueda('');
                            setCategoriaSeleccionada('TODOS');
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold cursor-pointer transition mt-2"
                    >
                        <X className="w-3.5 h-3.5" />
                        <span>Restablecer búsqueda</span>
                    </button>
                </div>
            ) : (
                <div className="space-y-3.5">
                    {logsFiltrados.map((log) => {
                        const info = getInfoAccion(log.accion);
                        const IconComponent = info.icon;
                        const userInfo = getNombreUsuario(log);

                        return (
                            <div
                                key={log.id_log}
                                className={`p-4 sm:p-5 bg-slate-950/75 border border-slate-800/80 rounded-2xl transition shadow-lg space-y-3.5 min-w-0 overflow-hidden ${info.borderClass}`}
                            >
                                {/* Fila Superior: Tipo de Acción y Fecha */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 min-w-0">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className={`p-2 rounded-xl border shrink-0 ${info.badgeClass}`}>
                                            <IconComponent className="w-4 h-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <span className="text-sm font-bold text-white block break-words">
                                                {info.titulo}
                                            </span>
                                            <span className="text-[11px] text-slate-400 block break-words">
                                                {info.descripcion}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Fecha y Hora */}
                                    <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium self-start sm:self-auto bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800/80 shrink-0">
                                        <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                        <span>{new Date(log.creado_at).toLocaleString()}</span>
                                    </div>
                                </div>

                                {/* Fila Media: Usuario Responsable e IP */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 px-3 rounded-xl bg-slate-900/50 border border-slate-800/60 text-xs min-w-0">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                                            <User className="w-3.5 h-3.5" />
                                        </div>
                                        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                                            <span className="text-slate-400 text-[11px] shrink-0">Realizado por:</span>
                                            <span className="font-semibold text-slate-100 break-words">{userInfo.nombre}</span>
                                            {userInfo.cargo && (
                                                <>
                                                    <span className="text-slate-600">•</span>
                                                    <span className="text-[11px] text-slate-400 font-medium break-words">
                                                        {userInfo.cargo}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {log.ip_origen && (
                                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono shrink-0 pl-8 sm:pl-0">
                                            <Globe className="w-3 h-3 text-slate-500" />
                                            <span>IP: {log.ip_origen}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Fila Inferior: Detalles de la Operación en Tarjetas Claras */}
                                {log.detalles && Object.keys(log.detalles).length > 0 && (
                                    <div className="space-y-1.5 pt-1 min-w-0">
                                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                                            Resumen de la Operación:
                                        </span>
                                        {renderDetallesAmigables(log)}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};