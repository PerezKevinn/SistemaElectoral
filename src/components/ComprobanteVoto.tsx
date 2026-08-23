import React from 'react';
import { ShieldCheck, Copy, Check } from 'lucide-react';

interface ComprobanteVotoProps {
    comprobanteHash: string;
    onFinalizar: () => void;
}

export const ComprobanteVoto: React.FC<ComprobanteVotoProps> = ({ comprobanteHash, onFinalizar }) => {
    const [copiado, setCopiado] = React.useState(false);

    const copiarHash = () => {
        navigator.clipboard.writeText(comprobanteHash);
        setCopiado(true);
        setTimeout(() => setCopiado(false), 2000);
    };

    return (
        <div className="max-w-md mx-auto p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center shadow-2xl">
            <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-bold text-white mb-1">Voto Registrado con Éxito</h2>
            <p className="text-xs text-slate-400 mb-6">
                Tu voto fue encriptado e integrado a la cadena de bloques inmutable de la urna.
            </p>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-left mb-6 relative">
                <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Comprobante Criptográfico (Hash SHA-256)
                </span>
                <code className="text-xs text-emerald-400 break-all font-mono leading-relaxed block">
                    {comprobanteHash}
                </code>
                <button
                    onClick={copiarHash}
                    className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-white transition"
                >
                    {copiado ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiado ? 'Copiado al portapapeles' : 'Copiar comprobante'}
                </button>
            </div>

            <button
                onClick={onFinalizar}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-xs transition"
            >
                Salir y Cerrar Sesión Segura
            </button>
        </div>
    );
};