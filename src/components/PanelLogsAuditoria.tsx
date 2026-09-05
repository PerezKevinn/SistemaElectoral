import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';

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

export const PanelLogsAuditoria: React.FC<PanelLogsAuditoriaProps> = ({ eleccionId, onVolver }) => {
    const [logs, setLogs] = useState<LogAuditoria[]>([]);
    const [loading, setLoading] = useState(true);

    const cargarLogs = async () => {
        setLoading(true);
        try {
            const token = sessionStorage.getItem('staff_token') || localStorage.getItem('auth_token');
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
        switch (accion) {
            case 'APERTURA_JORNADA':
                return {
                    titulo: 'Apertura de Jornada Electoral',
                    descripcion: 'Se inició oficialmente la jornada para recibir los sufragios de los electores.',
                    badgeClass: 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300',
                    borderClass: 'hover:border-cyan-500/40',
                    icon: PlayCircle,
                };
            case 'CIERRE_JORNADA':
                return {
                    titulo: 'Cierre y Sellado de Urna',
                    descripcion: 'Se clausuró la votación y se selló digitalmente la urna de forma definitiva e inmutable.',
                    badgeClass: 'bg-rose-950/80 border-rose-500/50 text-rose-300',
                    borderClass: 'hover:border-rose-500/40',
                    icon: Lock,
                };
            case 'CREACION_USUARIO_STAFF':
                return {
                    titulo: 'Registro de Funcionario',
                    descripcion: 'Se registró un nuevo miembro institucional para la administración electoral.',
                    badgeClass: 'bg-indigo-950/80 border-indigo-500/50 text-indigo-300',
                    borderClass: 'hover:border-indigo-500/40',
                    icon: UserCheck,
                };
            case 'ACTIVACION_USUARIO_STAFF':
                return {
                    titulo: 'Habilitación de Funcionario',
                    descripcion: 'Se activó el acceso institucional para el funcionario electoral.',
                    badgeClass: 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300',
                    borderClass: 'hover:border-emerald-500/40',
                    icon: CheckCircle2,
                };
            case 'DESACTIVACION_USUARIO_STAFF':
                return {
                    titulo: 'Suspensión de Funcionario',
                    descripcion: 'Se inhabilitó el acceso institucional para el funcionario electoral.',
                    badgeClass: 'bg-rose-950/80 border-rose-500/50 text-rose-300',
                    borderClass: 'hover:border-rose-500/40',
                    icon: UserX,
                };
            case 'RESTABLECIMIENTO_PASSWORD_STAFF':
                return {
                    titulo: 'Cambio de Contraseña',
                    descripcion: 'Se actualizó la contraseña del funcionario con cifrado seguro.',
                    badgeClass: 'bg-amber-950/80 border-amber-500/50 text-amber-300',
                    borderClass: 'hover:border-amber-500/40',
                    icon: KeyRound,
                };
            case 'CREAR_ELECCION':
                return {
                    titulo: 'Creación de Elección',
                    descripcion: 'Se configuró una nueva jornada electoral con sus planchas oficiales.',
                    badgeClass: 'bg-purple-950/80 border-purple-500/50 text-purple-300',
                    borderClass: 'hover:border-purple-500/40',
                    icon: ShieldCheck,
                };
            default:
                return {
                    titulo: accion.replace(/_/g, ' '),
                    descripcion: 'Evento administrativo registrado en la bitácora institucional.',
                    badgeClass: 'bg-slate-900 border-slate-700 text-slate-300',
                    borderClass: 'hover:border-slate-700',
                    icon: History,
                };
        }
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

    const renderDetallesAmigables = (accion: string, detalles: any) => {
        if (!detalles || typeof detalles !== 'object') return null;

        // 1. Apertura de jornada
        if (accion === 'APERTURA_JORNADA') {
            return (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                        <span className="text-slate-400 block text-[11px] mb-1 font-medium">Estado de la Urna</span>
                        <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span>Abierta para Votación</span>
                        </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                        <span className="text-slate-400 block text-[11px] mb-1 font-medium">Opciones / Planchas</span>
                        <span className="font-bold text-white font-mono text-sm">
                            {detalles.candidatosHabilitados || 0} candidaturas habilitadas
                        </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                        <span className="text-slate-400 block text-[11px] mb-1 font-medium">Verificación Técnica</span>
                        <span className="text-slate-200 font-medium">Cadena inicial en cero (0)</span>
                    </div>
                </div>
            );
        }

        // 2. Cierre de jornada
        if (accion === 'CIERRE_JORNADA') {
            return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                        <span className="text-slate-400 block text-[11px] mb-1 font-medium">Total de Votos Custodiados</span>
                        <span className="font-bold text-white font-mono text-sm">
                            {detalles.totalVotosSellados ?? 0} sufragios emitidos
                        </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                        <span className="text-slate-400 block text-[11px] mb-1 font-medium">Sello de Seguridad</span>
                        <span className="font-semibold text-cyan-300">Urna sellada definitivamente</span>
                    </div>
                </div>
            );
        }

        // 3. Creación de personal
        if (accion === 'CREACION_USUARIO_STAFF') {
            return (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                        <span className="text-slate-400 block text-[11px] mb-1 font-medium">Funcionario Registrado</span>
                        <span className="font-semibold text-white">{detalles.funcionario_creado || 'N/A'}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                        <span className="text-slate-400 block text-[11px] mb-1 font-medium">Rol Asignado</span>
                        <span className="font-semibold text-indigo-300">{detalles.rol || 'N/A'}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                        <span className="text-slate-400 block text-[11px] mb-1 font-medium">Documento de Identidad</span>
                        <span className="font-mono text-slate-200">{detalles.documento || 'N/A'}</span>
                    </div>
                </div>
            );
        }

        // 4. Activación / Desactivación
        if (accion === 'ACTIVACION_USUARIO_STAFF' || accion === 'DESACTIVACION_USUARIO_STAFF') {
            const esActivo = detalles.nuevo_estado === 'ACTIVO' || accion === 'ACTIVACION_USUARIO_STAFF';
            return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                        <span className="text-slate-400 block text-[11px] mb-1 font-medium">Funcionario</span>
                        <span className="font-semibold text-white">{detalles.funcionario_afectado || 'N/A'}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                        <span className="text-slate-400 block text-[11px] mb-1 font-medium">Estado de la Cuenta</span>
                        <span className={`font-bold ${esActivo ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {esActivo ? 'Cuenta Activa y Habilitada' : 'Cuenta Suspendida'}
                        </span>
                    </div>
                </div>
            );
        }

        // 5. Cambio de contraseña
        if (accion === 'RESTABLECIMIENTO_PASSWORD_STAFF') {
            return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                        <span className="text-slate-400 block text-[11px] mb-1 font-medium">Funcionario</span>
                        <span className="font-semibold text-white">{detalles.funcionario || 'N/A'}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                        <span className="text-slate-400 block text-[11px] mb-1 font-medium">Resultado de Seguridad</span>
                        <span className="font-semibold text-amber-300">Contraseña Actualizada con Éxito</span>
                    </div>
                </div>
            );
        }

        // 6. Formateador genérico elegante para otros eventos
        const traducirClave = (key: string) => {
            const map: Record<string, string> = {
                nuevoEstado: 'Estado',
                estadoPrevio: 'Estado Previo',
                candidatosHabilitados: 'Candidaturas',
                totalVotosSellados: 'Total Votos',
                funcionario_creado: 'Funcionario',
                funcionario_afectado: 'Funcionario',
                nuevo_estado: 'Estado',
                documento: 'Documento',
                rol: 'Rol',
                titulo: 'Título',
                descripcion: 'Descripción',
            };
            return map[key] || key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim();
        };

        const entries = Object.entries(detalles).filter(([k, v]) => v !== undefined && v !== null && k !== 'selloFinalHash');
        if (entries.length === 0) return null;

        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1 text-xs">
                {entries.map(([k, v]) => (
                    <div key={k} className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
                        <span className="text-slate-400 block text-[11px] capitalize mb-1 font-medium">{traducirClave(k)}</span>
                        <span className="font-semibold text-slate-200">
                            {typeof v === 'boolean' ? (v ? 'Sí' : 'No') : String(v)}
                        </span>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="w-full max-w-4xl mx-auto glass-panel p-4 sm:p-6 lg:p-8 rounded-2xl shadow-2xl space-y-6">
            {/* Header del Panel */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-5 gap-3">
                <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 shadow-md shadow-amber-950/40">
                        <History className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">Bitácora de Eventos y Auditoría</h2>
                        <p className="text-xs text-slate-400">Registro oficial de actividades, aperturas, cierres y gestión electoral</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={cargarLogs}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 rounded-xl transition text-xs font-semibold cursor-pointer"
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

            {/* Listado de Eventos */}
            {loading ? (
                <div className="text-center py-12 text-slate-400 text-xs space-y-2">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-400" />
                    <p>Consultando bitácora de auditoría...</p>
                </div>
            ) : logs.length === 0 ? (
                <div className="text-center py-12 bg-slate-950/40 border border-slate-800/80 rounded-2xl text-slate-500 text-xs">
                    No hay eventos registrados en la bitácora todavía.
                </div>
            ) : (
                <div className="space-y-3.5">
                    {logs.map((log) => {
                        const info = getInfoAccion(log.accion);
                        const IconComponent = info.icon;
                        const userInfo = getNombreUsuario(log);

                        return (
                            <div
                                key={log.id_log}
                                className={`p-4 sm:p-5 bg-slate-950/75 border border-slate-800/80 rounded-2xl transition shadow-lg space-y-3 ${info.borderClass}`}
                            >
                                {/* Fila Superior: Tipo de Acción y Fecha */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                    <div className="flex items-center gap-2.5">
                                        <div className={`p-2 rounded-xl border ${info.badgeClass}`}>
                                            <IconComponent className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <span className="text-sm font-bold text-white block">
                                                {info.titulo}
                                            </span>
                                            <span className="text-[11px] text-slate-400 block">
                                                {info.descripcion}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Fecha y Hora */}
                                    <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-medium self-start sm:self-auto bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800/80">
                                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                                        <span>{new Date(log.creado_at).toLocaleString()}</span>
                                    </div>
                                </div>

                                {/* Fila Media: Usuario Responsable */}
                                <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-slate-900/50 border border-slate-800/60 text-xs">
                                    <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0">
                                        <User className="w-3.5 h-3.5" />
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="text-slate-400 text-[11px]">Realizado por:</span>
                                        <span className="font-semibold text-slate-100">{userInfo.nombre}</span>
                                        {userInfo.cargo && (
                                            <>
                                                <span className="text-slate-600">•</span>
                                                <span className="text-[11px] text-slate-400 font-medium">{userInfo.cargo}</span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Fila Inferior: Detalles de la Operación en Tarjetas Claras */}
                                {log.detalles && (
                                    <div className="space-y-1.5 pt-1">
                                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                                            Resumen de la Operación:
                                        </span>
                                        {renderDetallesAmigables(log.accion, log.detalles)}
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