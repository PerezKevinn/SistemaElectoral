import React, { useState } from 'react';
import { Lock, ShieldAlert, CheckCircle2, AlertCircle, ArrowLeft, KeySquare } from 'lucide-react';

interface CierreResult {
    estado: string;
    totalVotosSellados: number;
    selloFinalHash: string;
    cerradoAt: string;
}

interface PanelAdminCierreProps {
    eleccionId: string;
    onVolver: () => void;
    onCierreCompletado?: () => void;
}

export const PanelAdminCierre: React.FC<PanelAdminCierreProps> = ({
    eleccionId,
    onVolver,
    onCierreCompletado,
}) => {
    const [clave, setClave] = useState('');
    const [loading, setLoading] = useState(false);
    const [resultado, setResultado] = useState<CierreResult | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleCerrar = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!clave) return;

        setLoading(true);
        setErrorMsg(null);

        try {
            const res = await fetch('/api/urna/cerrar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eleccionId,
                    adminClave: clave,
                }),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Error al ejecutar el cierre de la urna');
            }

            setResultado(data.data);
            if (onCierreCompletado) onCierreCompletado();
        } catch (err: any) {
            setErrorMsg(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-5">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-rose-500/10 border border-rose-500/30 rounded-lg">
                        <Lock className="w-6 h-6 text-rose-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Cierre Oficial de Jornada</h2>
                        <p className="text-xs text-slate-400">Control de custodia y sellado definitivo de la urna</p>
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

            {!resultado ? (
                <form onSubmit={handleCerrar} className="space-y-5">
                    <div className="p-4 bg-rose-950/20 border border-rose-800/40 rounded-xl flex items-start space-x-3 text-xs text-rose-300">
                        <ShieldAlert className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
                        <p>
                            Esta acción es <strong>irreversible</strong>. Una vez cerrada la elección, no se emitirán más tokens ni se recibirán votos.
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-2">
                            Clave de Custodia de la Autoridad Electoral
                        </label>
                        <div className="relative">
                            <input
                                type="password"
                                value={clave}
                                onChange={(e) => setClave(e.target.value)}
                                placeholder="Ingresa la clave secreta de administración"
                                className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-xl text-xs text-slate-200 placeholder-slate-600 outline-none transition font-mono"
                                required
                            />
                            <KeySquare className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                        </div>
                        <span className="text-[11px] text-slate-500 mt-1 block">Clave demo predeterminada: <code className="text-slate-400">ADMIN_SECRET_2026</code></span>
                    </div>

                    {errorMsg && (
                        <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-lg flex items-center space-x-2 text-red-300 text-xs">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !clave}
                        className="w-full py-3 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-semibold text-xs rounded-xl transition cursor-pointer"
                    >
                        {loading ? 'Sellando Urna Definitivamente...' : 'Proceder con el Cierre Electoral'}
                    </button>
                </form>
            ) : (
                <div className="p-5 bg-slate-950 border border-emerald-800/80 rounded-xl space-y-4">
                    <div className="flex items-center space-x-2 text-emerald-400">
                        <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                        <h3 className="font-bold text-sm text-emerald-200">Elección Cerrada y Sellada Oficialmente</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                            <span className="text-slate-400 block mb-1">Total Votos Sellados</span>
                            <span className="font-mono text-white text-base font-bold">{resultado.totalVotosSellados}</span>
                        </div>
                        <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                            <span className="text-slate-400 block mb-1">Fecha/Hora de Cierre</span>
                            <span className="font-mono text-slate-200">{new Date(resultado.cerradoAt).toLocaleTimeString()}</span>
                        </div>
                    </div>

                    <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                        <span className="text-slate-400 block mb-1 text-[11px]">Sello Criptográfico Raíz (Último Hash de Cadena)</span>
                        <p className="font-mono text-[11px] text-cyan-400 break-all">{resultado.selloFinalHash}</p>
                    </div>
                </div>
            )}
        </div>
    );
};