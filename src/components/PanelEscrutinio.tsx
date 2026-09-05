import React, { useEffect, useState } from 'react';
import { BarChart3, ShieldCheck, Users, RefreshCw, ArrowLeft } from 'lucide-react';

interface ResultadoCandidato {
    id_candidato: string;
    numero_lista: number;
    nombre_completo: string;
    total_votos: number;
    porcentaje: number;
}

interface EscrutinioData {
    totalVotos: number;
    totalTokensGenerados: number;
    tokensConsumidos: number;
    conteo: ResultadoCandidato[];
}

interface PanelEscrutinioProps {
    eleccionId: string;
    onVolver: () => void;
}

export const PanelEscrutinio: React.FC<PanelEscrutinioProps> = ({ eleccionId, onVolver }) => {
    const [data, setData] = useState<EscrutinioData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const cargarEscrutinio = async () => {
        setLoading(true);
        setErrorMsg(null);
        try {
            const token = sessionStorage.getItem('staff_token') || localStorage.getItem('auth_token');
            const url = eleccionId ? `/api/urna/resultados?eleccionId=${eleccionId}` : '/api/urna/resultados';

            const res = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            });

            if (res.ok) {
                const json = await res.json();
                if (json.success && json.data) {
                    setData(json.data);
                } else {
                    setErrorMsg(json.error || 'Error al obtener resultados');
                }
            } else {
                const errData = await res.json().catch(() => null);
                setErrorMsg(errData?.error || `Error del servidor (${res.status})`);
            }
        } catch (err: any) {
            console.error('Error al cargar resultados:', err);
            setErrorMsg(err.message || 'Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarEscrutinio();
    }, [eleccionId]);

    return (
        <div className="w-full max-w-4xl mx-auto glass-panel p-4 sm:p-6 lg:p-8 rounded-2xl shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-5 gap-3">
                <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
                        <BarChart3 className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">Panel de Escrutinio y Auditoría</h2>
                        <p className="text-xs text-slate-400">Resultados consolidados en tiempo real desde la urna digital</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={cargarEscrutinio}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold rounded-xl transition cursor-pointer"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        <span>Actualizar</span>
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

            {errorMsg && (
                <div className="p-4 bg-rose-950/40 border border-rose-800/80 rounded-xl text-rose-300 text-xs flex items-center justify-between">
                    <span>{errorMsg}</span>
                    <button
                        onClick={cargarEscrutinio}
                        className="px-2.5 py-1 bg-rose-900/60 hover:bg-rose-800 border border-rose-700 text-white rounded-lg text-xs"
                    >
                        Reintentar
                    </button>
                </div>
            )}

            {/* Métricas de Auditoría */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="p-4 bg-slate-950/80 border border-slate-800/80 rounded-xl">
                    <div className="flex items-center space-x-2 text-slate-400 mb-1">
                        <Users className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-medium">Votos Depositados</span>
                    </div>
                    <p className="text-2xl font-bold text-white font-mono">{data?.totalVotos ?? 0}</p>
                </div>

                <div className="p-4 bg-slate-950/80 border border-slate-800/80 rounded-xl">
                    <div className="flex items-center space-x-2 text-slate-400 mb-1">
                        <ShieldCheck className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs font-medium">Tokens Consumidos</span>
                    </div>
                    <p className="text-2xl font-bold text-white font-mono">{data?.tokensConsumidos ?? 0}</p>
                </div>

                <div className="p-4 bg-slate-950/80 border border-slate-800/80 rounded-xl">
                    <div className="flex items-center space-x-2 text-slate-400 mb-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs font-medium">Consistencia de Urna</span>
                    </div>
                    <p className="text-sm font-semibold text-emerald-400 font-mono mt-2">
                        {data && data.totalVotos === data.tokensConsumidos ? '100% Cuadrada (1:1)' : 'Verificando...'}
                    </p>
                </div>
            </div>

            {/* Lista de Resultados */}
            <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Desglose por Lista / Opción</h3>

                {loading && !data ? (
                    <div className="text-center py-8 text-slate-400 text-xs">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-400" />
                        <span>Consolidando resultados desde la urna...</span>
                    </div>
                ) : !data?.conteo || data.conteo.length === 0 ? (
                    <div className="p-6 bg-slate-950/60 border border-slate-800/70 rounded-xl text-center text-slate-400 text-xs">
                        No hay candidaturas registradas o votos emitidos en esta elección todavía.
                    </div>
                ) : (
                    data.conteo.map((item) => (
                        <div key={item.id_candidato} className="p-4 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-2.5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                                <div className="flex items-center space-x-2">
                                    <span className="px-2 py-0.5 bg-slate-800 text-indigo-300 font-bold font-mono rounded">
                                        #{item.numero_lista}
                                    </span>
                                    <span className="font-semibold text-slate-100">{item.nombre_completo}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-white font-mono text-sm">{item.total_votos} votos</span>
                                    <span className="text-emerald-400 font-mono font-semibold">({item.porcentaje}%)</span>
                                </div>
                            </div>

                            {/* Barra de Progreso */}
                            <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                                <div
                                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                                    style={{ width: `${item.porcentaje}%` }}
                                />
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};