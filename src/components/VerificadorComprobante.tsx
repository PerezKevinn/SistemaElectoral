import React, { useState } from 'react';
import { ShieldCheck, Search, ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';

const API_BASE_URL = 'https://sistema-elecciones-api.onrender.com';

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
            const res = await fetch(`${API_BASE_URL}/api/urna/verificar`, {
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
                throw new Error(data.error || 'El comprobante ingresado no existe en la urna digital.');
            }

            setResultado(data);
        } catch (err: any) {
            setError(err.message || 'Comprobante no hallado');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-xl mx-auto p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                        <ShieldCheck className="w-6 h-6 text-cyan-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white">Verificador Criptográfico de Papeleta</h2>
                        <p className="text-xs text-slate-400">Audita de forma independiente que tu voto fue contabilizado.</p>
                    </div>
                </div>

                <button
                    onClick={onVolver}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition cursor-pointer"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Volver</span>
                </button>
            </div>

            <form onSubmit={handleVerificar} className="space-y-4 text-xs">
                <div>
                    <label className="block text-slate-300 mb-1 font-medium">
                        Comprobante SHA-256 (64 caracteres)
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            value={hash}
                            onChange={(e) => setHash(e.target.value)}
                            placeholder="Ej: 5623f31f47082ec2b6a4e828439cf990f8291393de86ce22c732b283142ec14e"
                            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono outline-none focus:border-cyan-500 text-xs"
                            required
                        />
                        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading || !hash.trim()}
                    className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 text-white font-semibold rounded-xl transition cursor-pointer flex items-center justify-center space-x-2"
                >
                    <Search className="w-4 h-4" />
                    <span>{loading ? 'Verificando en Urna...' : 'Verificar Inclusión en Urna'}</span>
                </button>
            </form>

            {resultado && (
                <div className="p-4 bg-emerald-950/40 border border-emerald-800 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center space-x-2 text-emerald-300 font-bold">
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Papeleta Sellada y Contabilizada</span>
                    </div>
                    <p className="text-slate-300 font-mono text-[11px] break-all">
                        Hash: {hash}
                    </p>
                    {resultado.fecha && (
                        <p className="text-slate-400 text-[11px]">
                            Registrado: {new Date(resultado.fecha).toLocaleString()}
                        </p>
                    )}
                </div>
            )}

            {error && (
                <div className="p-4 bg-rose-950/40 border border-rose-800 rounded-xl space-y-1 text-xs">
                    <div className="flex items-center space-x-2 text-rose-300 font-bold">
                        <XCircle className="w-5 h-5" />
                        <span>Comprobante no hallado</span>
                    </div>
                    <p className="text-rose-400 text-[11px]">{error}</p>
                </div>
            )}
        </div>
    );
};