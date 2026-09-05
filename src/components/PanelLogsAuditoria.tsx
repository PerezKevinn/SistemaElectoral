import React, { useEffect, useState } from 'react';
import { History, Globe, Clock, User, ArrowLeft, RefreshCw } from 'lucide-react';

interface LogAuditoria {
    id_log: string;
    accion: string;
    ejecutado_por: string;
    ip_origen: string | null;
    user_agent: string | null;
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

    const getBadgeStyle = (accion: string) => {
        if (accion.includes('CREACION_USUARIO_STAFF')) {
            return 'bg-indigo-950/80 border-indigo-500/50 text-indigo-300';
        }
        if (accion.includes('ACTIVACION_USUARIO_STAFF')) {
            return 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300';
        }
        if (accion.includes('DESACTIVACION_USUARIO_STAFF')) {
            return 'bg-rose-950/80 border-rose-500/50 text-rose-300';
        }
        if (accion.includes('RESTABLECIMIENTO_PASSWORD_STAFF')) {
            return 'bg-amber-950/80 border-amber-500/50 text-amber-300';
        }
        if (accion === 'CIERRE_JORNADA') {
            return 'bg-red-950/90 border-red-500/60 text-red-300';
        }
        if (accion === 'APERTURA_JORNADA') {
            return 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300';
        }
        return 'bg-slate-900 border-slate-700 text-slate-300';
    };

    const getTituloDetalles = (accion: string) => {
        if (accion.includes('STAFF')) return 'Metadatos de Gestión de Personal:';
        if (accion === 'CIERRE_JORNADA') return 'Sello Criptográfico y Cierre:';
        if (accion === 'APERTURA_JORNADA') return 'Configuración Inicial de Jornada:';
        return 'Metadatos del Evento:';
    };

    return (
        <div className="w-full max-w-4xl mx-auto glass-panel p-4 sm:p-6 lg:p-8 rounded-2xl shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-5 gap-3">
                <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
                        <History className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">Bitácora de Eventos y Auditoría</h2>
                        <p className="text-xs text-slate-400">Trazabilidad de custodia, apertura, cierre y gestión de personal</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={cargarLogs}
                        className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl transition cursor-pointer"
                        title="Recargar logs"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
                    </button>
                    <button
                        onClick={onVolver}
                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium rounded-xl transition cursor-pointer"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Volver</span>
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-10 text-slate-400 text-xs">Cargando registros de auditoría...</div>
            ) : logs.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs">
                    No hay registros de eventos administrativos registrados.
                </div>
            ) : (
                <div className="space-y-3">
                    {logs.map((log) => (
                        <div
                            key={log.id_log}
                            className="p-4 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-2.5 text-xs"
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className={`px-2 py-0.5 border rounded-lg font-mono font-bold text-[10px] sm:text-[11px] ${getBadgeStyle(log.accion)}`}>
                                        {log.accion}
                                    </span>
                                    <span className="text-slate-300 font-mono text-[11px] flex items-center gap-1">
                                        <User className="w-3 h-3 text-slate-500" />
                                        {log.ejecutado_por}
                                    </span>
                                </div>
                                <div className="text-slate-500 font-mono text-[11px] flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {new Date(log.creado_at).toLocaleString()}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1 text-slate-400 border-t border-slate-900">
                                <div className="flex items-center space-x-1">
                                    <Globe className="w-3 h-3 text-slate-500" />
                                    <span>IP Origen:</span>
                                    <span className="font-mono text-slate-200">{log.ip_origen || 'N/A'}</span>
                                </div>
                                <div className="truncate">
                                    <span className="text-slate-500">Agente: </span>
                                    <span className="font-mono text-slate-400">{log.user_agent || 'N/A'}</span>
                                </div>
                            </div>

                            {log.detalles && (
                                <div className="mt-2 p-3 bg-slate-900/90 border border-slate-800/90 rounded-xl font-mono text-[10px] text-cyan-300 break-all">
                                    <span className="text-slate-400 block mb-1 font-sans text-xs">{getTituloDetalles(log.accion)}</span>
                                    <pre className="whitespace-pre-wrap">{JSON.stringify(log.detalles, null, 2)}</pre>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};