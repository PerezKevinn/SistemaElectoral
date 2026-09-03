import React, { useState } from 'react';
import { ShieldCheck, Search, ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';

interface VerificadorProps {
    eleccionId?: string;
    onVolver: () => void;
}

export const VerificadorComprobante: React.FC<VerificadorProps> = ({ eleccionId, onVolver }) => {
    const [hash, setHash] = useState('');
    const [loading, setLoading] = useState(false);
    const [resultado, setResultado] = useState<any | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleVerificar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!hash.trim()) return;

        setLoading(true);
        setError(null);
        setResultado(null);

        try {
            const res = await fetch('/api/urna/verificar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    comprobanteHash: hash.trim(),
                    hash: hash.trim(),
                    eleccionId,
                }),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'El código de verificación ingresado no figura en el registro oficial de la urna.');
            }

            setResultado(data);
        } catch (err: any) {
            setError(err.message || 'Comprobante no hallado');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-xl mx-auto glass-panel p-4 sm:p-6 lg:p-8 rounded-2xl shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-4 gap-3">
                <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white tracking-tight">Verificador de Sufragio</h2>
                        <p className="text-xs text-slate-400">Auditoría ciudadana: confirma la inclusión de tu voto</p>
                    </div>
                </div>

                <button
                    onClick={onVolver}
                    className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium rounded-xl transition cursor-pointer"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Volver</span>
                </button>
            </div>

            <form onSubmit={handleVerificar} className="space-y-4 text-xs">
                <div>
                    <label className="block text-slate-300 mb-1.5 font-semibold">
                        Código Único de Verificación de Sufragio
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            value={hash}
                            onChange={(e) => setHash(e.target.value)}
                            placeholder="Ingrese o pegue el código del comprobante"
                            className="w-full pl-9 pr-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-white font-mono outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-xs sm:text-sm"
                            required
                        />
                        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading || !hash.trim()}
                    className="w-full py-3 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 disabled:bg-slate-800 text-white font-bold rounded-xl transition cursor-pointer flex items-center justify-center space-x-2 text-xs sm:text-sm shadow-lg shadow-cyan-950/50"
                >
                    <Search className="w-4 h-4" />
                    <span>{loading ? 'Verificando en Urna...' : 'Verificar Inclusión en Urna'}</span>
                </button>
            </form>

            {resultado && (
                <div className="p-4 bg-emerald-950/40 border border-emerald-800/80 rounded-xl space-y-2 text-xs animate-in fade-in duration-200">
                    <div className="flex items-center space-x-2 text-emerald-300 font-bold">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <span>Papeleta Sellada y Contabilizada en la Urna</span>
                    </div>
                    <p className="text-slate-300 font-mono text-[11px] break-all bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                        Comprobante: {hash}
                    </p>
                    {resultado.fecha && (
                        <p className="text-slate-400 text-[11px]">
                            Fecha de inclusión: {new Date(resultado.fecha).toLocaleString()}
                        </p>
                    )}
                </div>
            )}

            {error && (
                <div className="p-4 bg-rose-950/40 border border-rose-800/80 rounded-xl space-y-1 text-xs animate-in fade-in duration-200">
                    <div className="flex items-center space-x-2 text-rose-300 font-bold">
                        <XCircle className="w-5 h-5 text-rose-400" />
                        <span>Comprobante no hallado</span>
                    </div>
                    <p className="text-rose-400 text-[11px]">{error}</p>
                </div>
            )}
        </div>
    );
};