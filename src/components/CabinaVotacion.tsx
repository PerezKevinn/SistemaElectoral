import React, { useState } from 'react';
import { Vote, CheckCircle2, AlertCircle } from 'lucide-react';

export interface Candidato {
    id: string;
    nombre: string;
    numeroLista: number;
    fotoUrl?: string;
}

interface CabinaVotacionProps {
    eleccionId: string;
    candidatos: Candidato[];
    tokenVotacion: string;
    onVotoCompletado: (comprobanteHash: string) => void;
}

export const CabinaVotacion: React.FC<CabinaVotacionProps> = ({
    eleccionId,
    candidatos,
    tokenVotacion,
    onVotoCompletado,
}) => {
    const [candidatoSeleccionado, setCandidatoSeleccionado] = useState<string | null>(null);
    const [confirmando, setConfirmando] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleEmitirVoto = async () => {
        if (!candidatoSeleccionado) return;
        setLoading(true);
        setErrorMsg(null);

        try {
            const response = await fetch('/api/urna/votar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eleccionId,
                    tokenPlano: tokenVotacion,
                    candidatoId: candidatoSeleccionado,
                }),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Error al procesar el voto en la urna');
            }

            onVotoCompletado(result.comprobanteHash);
        } catch (err: any) {
            setErrorMsg(err.message);
            setConfirmando(false);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-3xl mx-auto glass-panel p-4 sm:p-6 lg:p-8 rounded-2xl shadow-2xl space-y-6">
            <div className="border-b border-slate-800/80 pb-5">
                <div className="flex items-center space-x-3 mb-1">
                    <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
                        <Vote className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">Cabina de Votación Anónima</h2>
                        <p className="text-xs text-slate-400">
                            Selecciona tu candidato. Tu voto se enviará asociado a tu token ciego sin registrar tu identidad.
                        </p>
                    </div>
                </div>
            </div>

            {errorMsg && (
                <div className="p-3.5 bg-rose-950/60 border border-rose-800/80 text-rose-300 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{errorMsg}</span>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {candidatos.map((cand) => {
                    const isSelected = candidatoSeleccionado === cand.id;
                    return (
                        <div
                            key={cand.id}
                            onClick={() => !loading && setCandidatoSeleccionado(cand.id)}
                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-150 flex items-center justify-between ${isSelected
                                ? 'border-emerald-500 bg-emerald-950/40 shadow-lg shadow-emerald-950/50 ring-1 ring-emerald-500/40'
                                : 'border-slate-800 bg-slate-950/70 hover:border-slate-700 hover:bg-slate-900/50'
                                }`}
                        >
                            <div className="flex items-center space-x-3">
                                <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold font-mono text-sm ${isSelected ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30' : 'bg-slate-800 text-slate-300'
                                    }`}>
                                    #{cand.numeroLista}
                                </span>
                                <div>
                                    <h3 className="font-bold text-sm text-slate-100">{cand.nombre}</h3>
                                    <span className="text-[11px] text-slate-400">Lista {cand.numeroLista}</span>
                                </div>
                            </div>
                            <CheckCircle2 className={`w-5 h-5 ${isSelected ? 'text-emerald-400' : 'text-slate-700'}`} />
                        </div>
                    );
                })}
            </div>

            <div className="border-t border-slate-800/80 pt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs text-slate-500 font-mono">Papeleta de un solo uso • Secreto garantizado</span>

                {confirmando ? (
                    <div className="flex items-center gap-2.5">
                        <button
                            onClick={() => setConfirmando(false)}
                            disabled={loading}
                            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold rounded-xl transition cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleEmitirVoto}
                            disabled={loading}
                            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-emerald-950/60 cursor-pointer"
                        >
                            {loading ? 'Sellando Voto...' : 'Confirmar y Depositar'}
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setConfirmando(true)}
                        disabled={!candidatoSeleccionado}
                        className={`w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs transition ${candidatoSeleccionado
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/60 cursor-pointer'
                            : 'bg-slate-900 text-slate-600 cursor-not-allowed border border-slate-800'
                            }`}
                    >
                        Continuar con Selección →
                    </button>
                )}
            </div>
        </div>
    );
};