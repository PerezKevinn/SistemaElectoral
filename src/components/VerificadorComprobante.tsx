import React, { useState } from 'react';
import { Search, ShieldCheck, AlertTriangle, CheckCircle2, ArrowLeft, KeyRound, Layers } from 'lucide-react';

interface DatosAuditoria {
    comprobanteHash: string;
    eleccionId: string;
    secuencia: number;
    prevHash: string;
    estado: string;
}

interface VerificadorComprobanteProps {
    eleccionId: string;
    onVolver: () => void;
}

export const VerificadorComprobante: React.FC<VerificadorComprobanteProps> = ({ eleccionId, onVolver }) => {
    const [hashInput, setHashInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [resultado, setResultado] = useState<DatosAuditoria | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleVerificar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!hashInput.trim()) return;

        setLoading(true);
        setErrorMsg(null);
        setResultado(null);

        try {
            const res = await fetch('/api/urna/verificar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    comprobanteHash: hashInput.trim(),
                    eleccionId,
                }),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'No se encontró el comprobante en la urna');
            }

            setResultado(data.datosAuditoria);
        } catch (err: any) {
            setErrorMsg(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-5">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                        <ShieldCheck className="w-6 h-6 text-cyan-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Verificador Criptográfico de Papeleta</h2>
                        <p className="text-xs text-slate-400">
                            Audita de forma independiente que tu voto fue contabilizado sin comprometer tu anonimato.
                        </p>
                    </div>
                </div>

                <button
                    onClick={onVolver}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Volver</span>
                </button>
            </div>

            <form onSubmit={handleVerificar} className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">
                        Comprobante SHA-256 (64 caracteres)
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            value={hashInput}
                            onChange={(e) => setHashInput(e.target.value)}
                            placeholder="Ej: 262aea877a5931656fe32c2b6c3a848dc288dbdaedafec0a111905c73ad1e232"
                            className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-xl text-xs font-mono text-cyan-300 placeholder-slate-600 outline-none transition"
                            required
                        />
                        <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading || !hashInput.trim()}
                    className="w-full flex items-center justify-center space-x-2 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-semibold text-xs rounded-xl transition cursor-pointer"
                >
                    <Search className="w-4 h-4" />
                    <span>{loading ? 'Consultando Urna...' : 'Verificar Inclusión en Urna'}</span>
                </button>
            </form>

            {errorMsg && (
                <div className="p-4 bg-red-950/60 border border-red-800/80 rounded-xl flex items-start space-x-3 text-red-300">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-400 mt-0.5" />
                    <div className="text-xs space-y-1">
                        <p className="font-semibold text-red-200">Comprobante no hallado</p>
                        <p>{errorMsg}</p>
                    </div>
                </div>
            )}

            {resultado && (
                <div className="p-5 bg-emerald-950/30 border border-emerald-800/80 rounded-xl space-y-4">
                    <div className="flex items-center space-x-2 text-emerald-400">
                        <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                        <h3 className="font-bold text-sm text-emerald-200">Voto Válido y Sellado en la Urna</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="p-3 bg-slate-950 border border-slate-800/70 rounded-lg">
                            <span className="text-slate-400 block mb-1">Estado de Urna</span>
                            <span className="font-mono text-emerald-400 font-semibold">{resultado.estado}</span>
                        </div>

                        <div className="p-3 bg-slate-950 border border-slate-800/70 rounded-lg">
                            <div className="flex items-center space-x-1.5 text-slate-400 mb-1">
                                <Layers className="w-3.5 h-3.5" />
                                <span>Posición en Cadena (Bloque)</span>
                            </div>
                            <span className="font-mono text-cyan-400 font-semibold">
                                #{resultado.secuencia ?? 1}
                            </span>
                        </div>
                    </div>

                    <div className="p-3 bg-slate-950 border border-slate-800/70 rounded-lg space-y-2">
                        <div>
                            <span className="text-slate-400 block mb-1 text-[11px]">Huella Criptográfica del Voto (`voto_hash`)</span>
                            <p className="font-mono text-[11px] text-cyan-300 break-all">{resultado.comprobanteHash}</p>
                        </div>
                        {resultado.prevHash && (
                            <div>
                                <span className="text-slate-500 block mb-1 text-[11px]">Bloque Previo Enlazado (`prev_hash`)</span>
                                <p className="font-mono text-[11px] text-slate-400 break-all">{resultado.prevHash}</p>
                            </div>
                        )}
                    </div>

                    <p className="text-[11px] text-slate-400 text-center">
                        🔒 El secreto del voto se mantiene intacto: no existe vinculación a tu identidad ni a tu elección específica.
                    </p>
                </div>
            )}
        </div>
    );
};