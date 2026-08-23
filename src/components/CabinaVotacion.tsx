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
        <div className="max-w-3xl mx-auto p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl">
            <div className="border-b border-slate-800 pb-5 mb-6">
                <div className="flex items-center space-x-3 mb-1">
                    <Vote className="w-6 h-6 text-emerald-400" />
                    <h2 className="text-xl font-bold text-white">Cabina de Votación Anónima</h2>
                </div>
                <p className="text-xs text-slate-400">
                    Selecciona tu candidato. Tu voto se enviará asociado a tu token ciego sin registrar tu identidad.
                </p>
            </div>

            {errorMsg && (
                <div className="mb-6 p-3 bg-red-950/60 border border-red-800/80 text-red-300 rounded-lg text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{errorMsg}</span>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {candidatos.map((cand) => {
                    const isSelected = candidatoSeleccionado === cand.id;
                    return (
                        <div
                            key={cand.id}
                            onClick={() => !loading && setCandidatoSeleccionado(cand.id)}
                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-150 flex items-center justify-between ${isSelected
                                ? 'border-emerald-500 bg-emerald-950/30 shadow-lg shadow-emerald-950/40'
                                : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                                }`}
                        >
                            <div className="flex items-center space-x-3">
                                <span className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${isSelected ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                                    }`}>
                                    #{cand.numeroLista}
                                </span>
                                <div>
                                    <h3 className="font-semibold text-sm text-slate-100">{cand.nombre}</h3>
                                    <span className="text-[11px] text-slate-400">Lista {cand.numeroLista}</span>
                                </div>
                            </div>
                            <CheckCircle2 className={`w-5 h-5 ${isSelected ? 'text-emerald-400' : 'text-slate-700'}`} />
                        </div>
                    );
                })}
            </div>

            <div className="border-t border-slate-800 pt-5 flex items-center justify-between">
                <span className="text-xs text-slate-500">Papeleta activa de un solo uso</span>

                {confirmando ? (
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() => setConfirmando(false)}
                            disabled={loading}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleEmitirVoto}
                            disabled={loading}
                            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition"
                        >
                            {loading ? 'Sellando Voto...' : 'Confirmar y Depositar'}
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => setConfirmando(true)}
                        disabled={!candidatoSeleccionado}
                        className={`px-6 py-2.5 rounded-lg font-semibold text-xs transition ${candidatoSeleccionado
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                    >
                        Continuar →
                    </button>
                )}
            </div>
        </div>
    );
};