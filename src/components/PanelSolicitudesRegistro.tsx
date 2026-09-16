import React, { useState, useEffect } from 'react';
import {
    CheckCircle2,
    XCircle,
    Clock,
    Search,
    RefreshCw,
    Shield,
    ArrowLeft,
    Check,
    X,
    AlertTriangle,
    ShieldCheck,
    Ban,
} from 'lucide-react';
import { useToast } from './Toast';

export interface SolicitudVotante {
    id: string;
    codigo_radicado: string;
    documento_identidad: string;
    nombres: string;
    apellidos: string;
    correo: string;
    subdirectiva: string;
    telefono: string;
    estado: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'REVOCADA';
    motivo_rechazo?: string | null;
    revisado_por?: string | null;
    revisado_rol?: string | null;
    revisado_at?: string | null;
    ip_origen?: string | null;
    creado_at: string;
}

interface PanelSolicitudesRegistroProps {
    onVolver: () => void;
    rolUsuario?: 'ADMIN' | 'AUDITOR';
}

export const PanelSolicitudesRegistro: React.FC<PanelSolicitudesRegistroProps> = ({
    onVolver,
    rolUsuario = 'AUDITOR',
}) => {
    const toast = useToast();

    const [solicitudes, setSolicitudes] = useState<SolicitudVotante[]>([]);
    const [cargando, setCargando] = useState(false);
    const [filtroEstado, setFiltroEstado] = useState<'TODAS' | 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'REVOCADA'>('TODAS');
    const [busqueda, setBusqueda] = useState('');
    const [metricas, setMetricas] = useState({ total: 0, pendientes: 0, aprobadas: 0, rechazadas: 0, revocadas: 0 });

    // Selección múltiple para aprobación masiva
    const [seleccionadas, setSeleccionadas] = useState<string[]>([]);
    const [procesandoMasivo, setProcesandoMasivo] = useState(false);

    // Modal de Rechazo con Motivo
    const [solicitudARechazar, setSolicitudARechazar] = useState<SolicitudVotante | null>(null);
    const [motivoRechazo, setMotivoRechazo] = useState('');
    const [rechazando, setRechazando] = useState(false);

    // Estado de acción individual
    const [accionandoId, setAccionandoId] = useState<string | null>(null);

    const getAuthHeaders = () => {
        const token = localStorage.getItem('auth_token') || sessionStorage.getItem('staff_token');
        return {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        };
    };

    const cargarSolicitudes = async () => {
        setCargando(true);
        try {
            let url = `/api/censo/solicitudes?limit=250`;
            if (filtroEstado !== 'TODAS') url += `&estado=${filtroEstado}`;
            if (busqueda.trim()) url += `&busqueda=${encodeURIComponent(busqueda.trim())}`;

            const res = await fetch(url, { headers: getAuthHeaders() });
            const data = await res.json();

            if (res.ok && data.success) {
                setSolicitudes(data.solicitudes || []);
                if (data.metricas) {
                    setMetricas(data.metricas);
                }
            } else {
                throw new Error(data.error || 'Error al obtener solicitudes.');
            }
        } catch (err: any) {
            console.error('Error al cargar solicitudes:', err);
            toast.error(err.message, 'Fallo al Cargar Solicitudes');
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarSolicitudes();
    }, [filtroEstado]);

    // 1. Aprobar Solicitud Individual
    const handleAprobarSolicitud = async (solicitud: SolicitudVotante) => {
        setAccionandoId(solicitud.id);
        try {
            const res = await fetch('/api/censo/solicitudes/aprobar', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ idSolicitud: solicitud.id }),
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Error al aprobar solicitud');
            }

            if (data.emailSimulado) {
                toast.warning(
                    `Solicitud aprobada e inscrita en censo. (Modo Simulación: Credenciales generadas para ${solicitud.correo}).`,
                    'Aprobada (Simulación)'
                );
            } else {
                toast.success(
                    `Solicitud ${solicitud.codigo_radicado} aprobada. Elector incorporado al censo y credenciales despachadas.`,
                    'Solicitud Aprobada'
                );
            }

            cargarSolicitudes();
            setSeleccionadas(seleccionadas.filter((id) => id !== solicitud.id));
        } catch (err: any) {
            toast.error(err.message, 'Error de Aprobación');
        } finally {
            setAccionandoId(null);
        }
    };

    // 2. Abrir Modal de Rechazo
    const handleAbrirRechazo = (solicitud: SolicitudVotante) => {
        setSolicitudARechazar(solicitud);
        setMotivoRechazo('No figura en la relación oficial de nómina o padrón de la subdirectiva.');
    };

    // 3. Confirmar Rechazo
    const handleConfirmarRechazo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!solicitudARechazar) return;

        setRechazando(true);
        try {
            const res = await fetch('/api/censo/solicitudes/rechazar', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    idSolicitud: solicitudARechazar.id,
                    motivo: motivoRechazo.trim(),
                }),
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Error al rechazar solicitud');
            }

            toast.info(`Solicitud ${solicitudARechazar.codigo_radicado} rechazada con motivo institucional registrado.`, 'Solicitud Rechazada');
            setSolicitudARechazar(null);
            cargarSolicitudes();
        } catch (err: any) {
            toast.error(err.message, 'Fallo al Rechazar');
        } finally {
            setRechazando(false);
        }
    };

    // 4. Aprobación Masiva de Solicitudes Seleccionadas
    const handleAprobarMasivo = async () => {
        if (seleccionadas.length === 0) return;

        setProcesandoMasivo(true);
        try {
            const res = await fetch('/api/censo/solicitudes/aprobar-masivo', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ ids: seleccionadas }),
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Error en la aprobación masiva');
            }

            toast.success(
                `Se aprobaron ${data.resumen?.aprobadas || seleccionadas.length} solicitudes de registro.`,
                'Aprobación Masiva Exitosa'
            );
            setSeleccionadas([]);
            cargarSolicitudes();
        } catch (err: any) {
            toast.error(err.message, 'Fallo Masivo');
        } finally {
            setProcesandoMasivo(false);
        }
    };

    const toggleSeleccion = (id: string) => {
        if (seleccionadas.includes(id)) {
            setSeleccionadas(seleccionadas.filter((item) => item !== id));
        } else {
            setSeleccionadas([...seleccionadas, id]);
        }
    };

    const toggleSeleccionarTodas = () => {
        const pendientesIds = solicitudes.filter((s) => s.estado === 'PENDIENTE').map((s) => s.id);
        if (seleccionadas.length === pendientesIds.length && pendientesIds.length > 0) {
            setSeleccionadas([]);
        } else {
            setSeleccionadas(pendientesIds);
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto w-full">
            {/* Header */}
            <div className="glass-panel p-5 sm:p-6 rounded-2xl border border-slate-700/80 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onVolver}
                        className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 rounded-xl transition cursor-pointer"
                        title="Regresar al panel principal"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-cyan-400">
                                Módulo de Verificación y Control
                            </span>
                            <span className="w-1 h-1 rounded-full bg-slate-600" />
                            <span className="text-[10px] text-slate-400">Rol: {rolUsuario}</span>
                        </div>
                        <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-cyan-400" />
                            Solicitudes de Registro de Votantes
                        </h1>
                    </div>
                </div>

                {/* Acciones Rápidas */}
                <div className="flex items-center gap-2">
                    {seleccionadas.length > 0 && (
                        <button
                            onClick={handleAprobarMasivo}
                            disabled={procesandoMasivo}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-lg shadow-emerald-950/60"
                        >
                            {procesandoMasivo ? (
                                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <CheckCircle2 className="w-4 h-4" />
                            )}
                            <span>Aprobar Seleccionadas ({seleccionadas.length})</span>
                        </button>
                    )}

                    <button
                        onClick={cargarSolicitudes}
                        disabled={cargando}
                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 rounded-xl text-xs font-semibold transition cursor-pointer"
                        title="Refrescar lista"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${cargando ? 'animate-spin text-cyan-400' : ''}`} />
                        <span className="hidden sm:inline">Actualizar</span>
                    </button>
                </div>
            </div>

            {/* Metricas Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                <div className="glass-panel p-4 rounded-xl border border-amber-900/40 bg-amber-950/10">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-amber-300">Pendientes</span>
                        <Clock className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-white">{metricas.pendientes}</div>
                    <span className="text-[10px] text-slate-400">Por revisar</span>
                </div>

                <div className="glass-panel p-4 rounded-xl border border-emerald-900/40 bg-emerald-950/10">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-emerald-300">Aprobadas</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-white">{metricas.aprobadas}</div>
                    <span className="text-[10px] text-slate-400">En censo</span>
                </div>

                <div className="glass-panel p-4 rounded-xl border border-rose-900/40 bg-rose-950/10">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-rose-300">Rechazadas</span>
                        <XCircle className="w-4 h-4 text-rose-400" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-white">{metricas.rechazadas}</div>
                    <span className="text-[10px] text-slate-400">No aprobadas</span>
                </div>

                <div className="glass-panel p-4 rounded-xl border border-purple-900/40 bg-purple-950/10">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-purple-300">Revocadas</span>
                        <Ban className="w-4 h-4 text-purple-400" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-white">{metricas.revocadas || 0}</div>
                    <span className="text-[10px] text-slate-400">Desvinculadas</span>
                </div>

                <div className="glass-panel p-4 rounded-xl border border-slate-700/80 bg-slate-900/40 col-span-2 sm:col-span-1">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-slate-300">Total</span>
                        <Shield className="w-4 h-4 text-cyan-400" />
                    </div>
                    <div className="text-2xl font-bold font-mono text-white">{metricas.total}</div>
                    <span className="text-[10px] text-slate-400">Histórico</span>
                </div>
            </div>

            {/* Barra de Búsqueda y Filtros */}
            <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    {/* Búsqueda */}
                    <div className="relative w-full sm:max-w-md">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                            type="text"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && cargarSolicitudes()}
                            placeholder="Buscar por cédula, nombre, correo, radicado o subdirectiva..."
                            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500 transition"
                        />
                    </div>

                    {/* Filtros de Estado */}
                    <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                        {(['TODAS', 'PENDIENTE', 'APROBADA', 'RECHAZADA', 'REVOCADA'] as const).map((est) => (
                            <button
                                key={est}
                                onClick={() => setFiltroEstado(est)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${filtroEstado === est
                                    ? est === 'PENDIENTE'
                                        ? 'bg-amber-600 text-white'
                                        : est === 'APROBADA'
                                            ? 'bg-emerald-600 text-white'
                                            : est === 'RECHAZADA'
                                                ? 'bg-rose-600 text-white'
                                                : est === 'REVOCADA'
                                                    ? 'bg-purple-600 text-white'
                                                    : 'bg-cyan-600 text-white'
                                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                                    }`}
                            >
                                {est === 'TODAS'
                                    ? 'Todas'
                                    : est === 'PENDIENTE'
                                        ? 'Pendientes'
                                        : est === 'APROBADA'
                                            ? 'Aprobadas'
                                            : est === 'RECHAZADA'
                                                ? 'Rechazadas'
                                                : 'Revocadas'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tabla de Solicitudes */}
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/70">
                    <table className="w-full text-left text-xs text-slate-300 font-sans">
                        <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] font-mono border-b border-slate-800">
                            <tr>
                                <th className="p-3 w-8">
                                    <input
                                        type="checkbox"
                                        checked={
                                            solicitudes.filter((s) => s.estado === 'PENDIENTE').length > 0 &&
                                            seleccionadas.length === solicitudes.filter((s) => s.estado === 'PENDIENTE').length
                                        }
                                        onChange={toggleSeleccionarTodas}
                                        className="rounded border-slate-700 bg-slate-900 text-cyan-600 focus:ring-0 cursor-pointer"
                                        title="Seleccionar todas las solicitudes pendientes"
                                    />
                                </th>
                                <th className="px-4 py-3">Radicado</th>
                                <th className="px-4 py-3">Documento</th>
                                <th className="px-4 py-3">Nombre del Elector</th>
                                <th className="px-4 py-3">Correo Electrónico</th>
                                <th className="px-4 py-3">Subdirectiva</th>
                                <th className="px-4 py-3">Estado</th>
                                <th className="px-4 py-3 text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-xs">
                            {cargando ? (
                                <tr>
                                    <td colSpan={8} className="py-8 text-center text-slate-500">
                                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-cyan-400" />
                                        Cargando solicitudes de registro...
                                    </td>
                                </tr>
                            ) : solicitudes.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="py-8 text-center text-slate-500">
                                        No se encontraron solicitudes con los criterios seleccionados.
                                    </td>
                                </tr>
                            ) : (
                                solicitudes.map((sol) => {
                                    const esPendiente = sol.estado === 'PENDIENTE';
                                    const estaSeleccionada = seleccionadas.includes(sol.id);

                                    return (
                                        <tr
                                            key={sol.id}
                                            className={`hover:bg-slate-900/40 transition ${estaSeleccionada ? 'bg-cyan-950/20' : ''
                                                }`}
                                        >
                                            <td className="p-3">
                                                {esPendiente && (
                                                    <input
                                                        type="checkbox"
                                                        checked={estaSeleccionada}
                                                        onChange={() => toggleSeleccion(sol.id)}
                                                        className="rounded border-slate-700 bg-slate-900 text-cyan-600 focus:ring-0 cursor-pointer"
                                                    />
                                                )}
                                            </td>

                                            {/* Radicado */}
                                            <td className="px-4 py-3 font-mono text-cyan-400 font-bold whitespace-nowrap">
                                                {sol.codigo_radicado}
                                            </td>

                                            {/* Documento */}
                                            <td className="px-4 py-3 font-mono font-semibold text-white whitespace-nowrap">
                                                {sol.documento_identidad}
                                            </td>

                                            {/* Nombre y Teléfono */}
                                            <td className="px-4 py-3">
                                                <span className="font-semibold text-slate-200 block">
                                                    {sol.nombres} {sol.apellidos}
                                                </span>
                                                {sol.telefono && (
                                                    <span className="text-[10px] text-slate-500 font-mono">
                                                        Tel: {sol.telefono}
                                                    </span>
                                                )}
                                            </td>

                                            {/* Correo */}
                                            <td className="px-4 py-3 font-mono text-slate-400">
                                                {sol.correo}
                                            </td>

                                            {/* Subdirectiva */}
                                            <td className="px-4 py-3 text-slate-300">
                                                <span className="inline-block px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px]">
                                                    {sol.subdirectiva || 'General'}
                                                </span>
                                            </td>

                                            {/* Estado */}
                                            <td className="px-4 py-3">
                                                {sol.estado === 'PENDIENTE' && (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800/60">
                                                        <Clock className="w-3 h-3 text-amber-400" /> Pendiente
                                                    </span>
                                                )}
                                                {sol.estado === 'APROBADA' && (
                                                    <div>
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                                                            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Aprobada
                                                        </span>
                                                        {sol.revisado_por && (
                                                            <span className="block text-[9px] text-slate-500 font-mono mt-0.5">
                                                                Por: {sol.revisado_por} ({sol.revisado_rol})
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                                {sol.estado === 'RECHAZADA' && (
                                                    <div>
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800/60">
                                                            <XCircle className="w-3 h-3 text-rose-400" /> Rechazada
                                                        </span>
                                                        {sol.motivo_rechazo && (
                                                            <span className="block text-[9px] text-rose-400 mt-0.5 line-clamp-1" title={sol.motivo_rechazo}>
                                                                {sol.motivo_rechazo}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                                {sol.estado === 'REVOCADA' && (
                                                    <div>
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-800/60">
                                                            <Ban className="w-3 h-3 text-purple-400" /> Revocada
                                                        </span>
                                                        {sol.motivo_rechazo && (
                                                            <span className="block text-[9px] text-purple-400 mt-0.5 line-clamp-1" title={sol.motivo_rechazo}>
                                                                {sol.motivo_rechazo}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Acciones */}
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {esPendiente ? (
                                                        <>
                                                            <button
                                                                onClick={() => handleAprobarSolicitud(sol)}
                                                                disabled={accionandoId === sol.id}
                                                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-[11px] font-semibold transition cursor-pointer flex items-center gap-1 shadow-sm"
                                                                title="Aprobar solicitud, crear en censo oficial y despachar credenciales por correo"
                                                            >
                                                                {accionandoId === sol.id ? (
                                                                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                                ) : (
                                                                    <Check className="w-3 h-3" />
                                                                )}
                                                                <span>Aprobar</span>
                                                            </button>
                                                            <button
                                                                onClick={() => handleAbrirRechazo(sol)}
                                                                disabled={accionandoId === sol.id}
                                                                className="px-2.5 py-1 bg-slate-900 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-slate-800 hover:border-rose-900/60 rounded-lg text-[11px] font-semibold transition cursor-pointer flex items-center gap-1"
                                                                title="Rechazar solicitud con motivo institucional"
                                                            >
                                                                <X className="w-3 h-3 text-rose-400" />
                                                                <span>Rechazar</span>
                                                            </button>
                                                        </>
                                                    ) : sol.estado === 'RECHAZADA' ? (
                                                        <button
                                                            onClick={() => handleAprobarSolicitud(sol)}
                                                            disabled={accionandoId === sol.id}
                                                            className="px-2.5 py-1 bg-slate-900 hover:bg-emerald-950/60 text-slate-300 hover:text-emerald-300 border border-slate-800 hover:border-emerald-900/60 rounded-lg text-[11px] font-semibold transition cursor-pointer"
                                                            title="Reconsiderar y aprobar"
                                                        >
                                                            Reconsiderar y Aprobar
                                                        </button>
                                                    ) : (
                                                        <span className="text-[11px] font-mono text-emerald-400 font-semibold flex items-center gap-1">
                                                            <Check className="w-3 h-3" /> Incorporado
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL DE RECHAZO CON MOTIVO */}
            {solicitudARechazar && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="max-w-md w-full glass-panel border border-rose-900/60 rounded-2xl p-6 space-y-4 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-rose-400" />
                                <h3 className="text-sm font-bold text-white">Rechazar Solicitud de Registro</h3>
                            </div>
                            <button
                                onClick={() => setSolicitudARechazar(null)}
                                className="text-slate-400 hover:text-white transition cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-1">
                            <div>
                                <span className="text-slate-500">Radicado:</span>{' '}
                                <strong className="text-white font-mono">{solicitudARechazar.codigo_radicado}</strong>
                            </div>
                            <div>
                                <span className="text-slate-500">Elector:</span>{' '}
                                <strong className="text-slate-200">
                                    {solicitudARechazar.nombres} {solicitudARechazar.apellidos}
                                </strong>
                            </div>
                            <div>
                                <span className="text-slate-500">Documento:</span>{' '}
                                <span className="text-slate-300 font-mono">{solicitudARechazar.documento_identidad}</span>
                            </div>
                        </div>

                        <form onSubmit={handleConfirmarRechazo} className="space-y-3.5 text-xs">
                            <div>
                                <label className="block text-slate-300 font-semibold mb-1">
                                    Motivo Institucional de Rechazo *
                                </label>
                                <textarea
                                    required
                                    rows={3}
                                    value={motivoRechazo}
                                    onChange={(e) => setMotivoRechazo(e.target.value)}
                                    placeholder="Indique la causa por la cual se rechaza la solicitud de inscripción..."
                                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-lg text-white outline-none"
                                />
                            </div>

                            {/* Motivos Rápidos */}
                            <div className="space-y-1">
                                <span className="text-[10px] text-slate-400 block font-semibold">Motivos preestablecidos:</span>
                                <div className="flex flex-wrap gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setMotivoRechazo('No figura en la relación oficial de nómina o padrón de la subdirectiva.')}
                                        className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-[10px] text-slate-300 transition"
                                    >
                                        No figura en nómina
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMotivoRechazo('Los datos de identificación presentan inconsistencias con el documento.')}
                                        className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-[10px] text-slate-300 transition"
                                    >
                                        Inconsistencia de datos
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setMotivoRechazo('Subdirectiva o seccional no corresponde a la jurisdicción electoral activa.')}
                                        className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded text-[10px] text-slate-300 transition"
                                    >
                                        Jurisdicción no válida
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setSolicitudARechazar(null)}
                                    className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 transition cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={rechazando || !motivoRechazo.trim()}
                                    className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-md"
                                >
                                    {rechazando ? 'Procesando...' : 'Confirmar Rechazo'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
