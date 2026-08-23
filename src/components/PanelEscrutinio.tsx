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

    const cargarEscrutinio = async () => {
        setLoading(true);
        try {
            const token = sessionStorage.getItem('staff_token');

            const res = await fetch(`/api/urna/resultados?eleccionId=${eleccionId}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            });

            const json = await res.json();
            if (json.success && json.data) {
                setData(json.data);
            }
        } catch (err) {
            console.error('Error al cargar resultados:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarEscrutinio();
    }, [eleccionId]);

    return (
        <div className="max-w-4xl mx-auto p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-5">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                        <BarChart3 className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Panel de Escrutinio y Auditoría</h2>
                        <p className="text-xs text-slate-400">Resultados consolidados en tiempo real desde la urna criptográfica</p>
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    <button
                        onClick={cargarEscrutinio}
                        disabled={loading}
                        className="flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        <span>Actualizar</span>
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

            {/* Métricas de Auditoría */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-xl">
                    <div className="flex items-center space-x-2 text-slate-400 mb-1">
                        <Users className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-medium">Votos Depositados</span>
                    </div>
                    <p className="text-2xl font-bold text-white font-mono">{data?.totalVotos ?? 0}</p>
                </div>

                <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-xl">
                    <div className="flex items-center space-x-2 text-slate-400 mb-1">
                        <ShieldCheck className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs font-medium">Tokens Consumidos</span>
                    </div>
                    <p className="text-2xl font-bold text-white font-mono">{data?.tokensConsumidos ?? 0}</p>
                </div>

                <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-xl">
                    <div className="flex items-center space-x-2 text-slate-400 mb-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs font-medium">Consistencia de Urna</span>
                    </div>
                    <p className="text-sm font-semibold text-emerald-400 font-mono mt-2">
                        {data && data.totalVotos === data.tokensConsumidos ? '100% Blindada (1:1)' : 'Verificando...'}
                    </p>
                </div>
            </div>

            {/* Lista de Resultados */}
            <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Desglose por Lista / Opción</h3>

                {data?.conteo.map((item) => (
                    <div key={item.id_candidato} className="p-4 bg-slate-950 border border-slate-800/60 rounded-xl space-y-2">
                        <div className="flex justify-between items-center text-xs">
                            <div className="flex items-center space-x-2">
                                <span className="px-2 py-0.5 bg-slate-800 text-slate-300 font-bold rounded">
                                    #{item.numero_lista}
                                </span>
                                <span className="font-semibold text-slate-200">{item.nombre_completo}</span>
                            </div>
                            <div className="text-right">
                                <span className="font-bold text-white font-mono">{item.total_votos} votos</span>
                                <span className="text-slate-400 ml-2 font-mono">({item.porcentaje}%)</span>
                            </div>
                        </div>

                        {/* Barra de Progreso */}
                        <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                            <div
                                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                                style={{ width: `${item.porcentaje}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};