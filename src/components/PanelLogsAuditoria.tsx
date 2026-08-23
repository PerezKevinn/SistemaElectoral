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
            const token = sessionStorage.getItem('staff_token');
            const res = await fetch(`/api/urna/logs?eleccionId=${eleccionId}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            });

            const data = await res.json();
            if (data.success) {
                setLogs(data.logs || []);
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
        <div className="max-w-4xl mx-auto p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-5">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                        <History className="w-6 h-6 text-amber-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Bitácora de Eventos Administrativos</h2>
                        <p className="text-xs text-slate-400">Trazabilidad de custodia, apertura, cierre y gestión de credenciales</p>
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    <button
                        onClick={cargarLogs}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                        title="Recargar logs"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
                    </button>
                    <button
                        onClick={onVolver}
                        className="flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition"
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
                            className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <span className={`px-2 py-0.5 border rounded font-mono font-bold text-[11px] ${getBadgeStyle(log.accion)}`}>
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

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] pt-1 text-slate-400">
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
                                <div className="mt-2 p-2 bg-slate-900 border border-slate-800/80 rounded font-mono text-[10px] text-cyan-300 break-all">
                                    <span className="text-slate-400 block mb-0.5">{getTituloDetalles(log.accion)}</span>
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