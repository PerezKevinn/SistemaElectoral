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
        <div className="w-full max-w-md mx-auto p-5 sm:p-7 glass-panel rounded-2xl text-center shadow-2xl space-y-4">
            <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/40">
                <ShieldCheck className="w-8 h-8" />
            </div>

            <div>
                <h2 className="text-lg sm:text-xl font-bold text-white mb-1">Voto Registrado con Éxito</h2>
                <p className="text-xs text-slate-400">
                    Tu voto fue protegido e integrado a la cadena de custodia inmutable de la urna.
                </p>
            </div>

            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800/80 text-left relative">
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">
                    Código Único de Verificación de Sufragio
                </span>
                <code className="text-xs text-emerald-400 break-all font-mono leading-relaxed block bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                    {comprobanteHash}
                </code>
                <button
                    onClick={copiarHash}
                    className="mt-3 flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition cursor-pointer font-medium"
                >
                    {copiado ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiado ? 'Copiado al portapapeles' : 'Copiar código de verificación'}</span>
                </button>
            </div>

            <button
                onClick={onFinalizar}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-bold rounded-xl text-xs sm:text-sm transition cursor-pointer shadow-md"
            >
                Salir y Cerrar Sesión Segura
            </button>
        </div>
    );
};