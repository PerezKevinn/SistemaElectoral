import React, { useState, useEffect } from 'react';
import {
    ShieldCheck,
    CheckCircle2,
    AlertTriangle,
    RefreshCw,
    Link2,
    Lock,
    Copy,
    Check,
    ArrowDown,
    Activity,
    Layers,
    Clock,
    Database,
} from 'lucide-react';
import { useToast } from './Toast';

interface BloqueAuditado {
    secuencia: number;
    idVoto: string;
    votoHash: string;
    prevHash: string;
    estadoCriptografico: 'VALIDO' | 'CORRUPTO';
}

interface AuditoriaReporte {
    esIntegra: boolean;
    motivoFallo: string | null;
    bloqueInvalidoIndex: number | null;
    totalBloquesAnalizados: number;
    duracionVerificacionMs: number;
    hashGenesis: string;
    hashRaizFinal: string;
    timestampVerificacion: string;
    bloques: BloqueAuditado[];
}

interface VerificadorCadenaProps {
    eleccionId?: string;
    onVolver?: () => void;
}

export const VerificadorCadenaHashes: React.FC<VerificadorCadenaProps> = ({ eleccionId, onVolver }) => {
    const [reporte, setReporte] = useState<AuditoriaReporte | null>(null);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [copiadoHash, setCopiadoHash] = useState<string | null>(null);
    const toast = useToast();

    const ejecutarAuditoria = async () => {
        if (!eleccionId) {
            setErrorMsg('No se especificó el ID de la elección para auditar.');
            return;
        }

        setLoading(true);
        setErrorMsg(null);

        try {
            const token = sessionStorage.getItem('staff_token') || localStorage.getItem('auth_token');
            const res = await fetch(`/api/urna/auditoria/cadena?eleccionId=${eleccionId}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            });

            if (!res.ok) {
                let msg = `Error al verificar la cadena (${res.status})`;
                try {
                    const errData = await res.json();
                    if (errData?.error) msg = errData.error;
                } catch { }
                throw new Error(msg);
            }

            const data = await res.json();
            if (data.success && data.auditoria) {
                setReporte(data.auditoria);
                if (data.auditoria.esIntegra) {
                    toast.success(
                        `Cadena verificada: ${data.auditoria.totalBloquesAnalizados} bloques inmutables auditados en ${data.auditoria.duracionVerificacionMs}ms`,
                        'Integridad Criptográfica 100%'
                    );
                } else {
                    toast.error(data.auditoria.motivoFallo || 'Se detectó una inconsistencia en la cadena de votos.', 'Fallo de Integridad');
                }
            } else {
                throw new Error(data.error || 'No se pudo generar el reporte de auditoría.');
            }
        } catch (err: any) {
            console.error('Error durante auditoría de hashes:', err);
            setErrorMsg(err.message);
            toast.error(err.message, 'Error de Auditoría');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        ejecutarAuditoria();
    }, [eleccionId]);

    const copiarAlPortapapeles = (texto: string, label: string) => {
        navigator.clipboard.writeText(texto);
        setCopiadoHash(texto);
        toast.info(`Copiado al portapapeles: ${label}`);
        setTimeout(() => setCopiadoHash(null), 2000);
    };

    return (
        <div className="w-full max-w-5xl mx-auto glass-panel p-4 sm:p-6 lg:p-8 rounded-2xl shadow-2xl space-y-6 animate-in fade-in duration-300">
            {/* Header del Panel */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-5 gap-4">
                <div className="flex items-center space-x-3">
                    <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400 shadow-md shadow-cyan-950/40">
                        <Link2 className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-2">
                            Auditoría de Cadena Criptográfica
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                                SHA-256 Ledger
                            </span>
                        </h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Verificación matemática continua de enlaces génesis, secuencia y sellos inmutables
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={ejecutarAuditoria}
                        disabled={loading}
                        className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-slate-800 hover:border-cyan-500/40 rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        <span>Reauditar Cadena</span>
                    </button>
                    {onVolver && (
                        <button
                            onClick={onVolver}
                            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-semibold transition cursor-pointer"
                        >
                            Volver
                        </button>
                    )}
                </div>
            </div>

            {errorMsg && (
                <div className="p-4 bg-rose-950/40 border border-rose-800/80 rounded-xl text-rose-300 text-xs flex items-center space-x-3">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                    <span className="leading-relaxed">{errorMsg}</span>
                </div>
            )}

            {/* Banner de Estado de Integridad */}
            {reporte && (
                <div
                    className={`p-5 rounded-2xl border backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                        reporte.esIntegra
                            ? 'bg-emerald-950/30 border-emerald-500/40 shadow-lg shadow-emerald-950/20'
                            : 'bg-rose-950/30 border-rose-500/40 shadow-lg shadow-rose-950/20'
                    }`}
                >
                    <div className="flex items-center gap-3.5">
                        <div
                            className={`p-3 rounded-xl border ${
                                reporte.esIntegra
                                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                                    : 'bg-rose-500/10 border-rose-500/40 text-rose-400'
                            }`}
                        >
                            {reporte.esIntegra ? <ShieldCheck className="w-7 h-7" /> : <AlertTriangle className="w-7 h-7" />}
                        </div>
                        <div>
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                Estado de Certificación Matemática
                            </span>
                            <h3
                                className={`text-base sm:text-lg font-black tracking-tight mt-0.5 ${
                                    reporte.esIntegra ? 'text-emerald-300' : 'text-rose-300'
                                }`}
                            >
                                {reporte.esIntegra
                                    ? '✓ 100% CADENA CRIPTOGRÁFICA INMUTABLE Y VÁLIDA'
                                    : '⚠️ DETECTADA INCONSISTENCIA EN LA CADENA DE BLOQUES'}
                            </h3>
                            <p className="text-xs text-slate-300 mt-0.5 font-sans">
                                {reporte.esIntegra
                                    ? `Todos los ${reporte.totalBloquesAnalizados} bloques mantienen consistencia criptográfica estricta con el hash génesis.`
                                    : reporte.motivoFallo}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-auto text-xs font-mono">
                        <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Auditado en {reporte.duracionVerificacionMs} ms</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Métricas de la Cadena */}
            {reporte && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                        <div className="flex items-center justify-between text-slate-400 text-xs">
                            <span>Total Bloques Encadenados</span>
                            <Layers className="w-4 h-4 text-cyan-400" />
                        </div>
                        <span className="text-2xl font-black text-white font-mono block">
                            {reporte.totalBloquesAnalizados}
                        </span>
                        <span className="text-[11px] text-slate-500 block">Eslabones verificados 1 a 1</span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                        <div className="flex items-center justify-between text-slate-400 text-xs">
                            <span>Hash Génesis Inicial</span>
                            <Database className="w-4 h-4 text-indigo-400" />
                        </div>
                        <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-mono text-indigo-300 truncate">
                                {reporte.hashGenesis.substring(0, 16)}...{reporte.hashGenesis.slice(-8)}
                            </span>
                            <button
                                onClick={() => copiarAlPortapapeles(reporte.hashGenesis, 'Hash Génesis')}
                                className="p-1 text-slate-500 hover:text-white transition"
                                title="Copiar Hash Génesis"
                            >
                                {copiadoHash === reporte.hashGenesis ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                        <span className="text-[11px] text-slate-500 block">Anclaje del bloque #1</span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-1">
                        <div className="flex items-center justify-between text-slate-400 text-xs">
                            <span>Sello Raíz de Clausura</span>
                            <Lock className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div className="flex items-center justify-between gap-1">
                            <span className="text-xs font-mono text-emerald-300 truncate">
                                {reporte.hashRaizFinal.substring(0, 16)}...{reporte.hashRaizFinal.slice(-8)}
                            </span>
                            <button
                                onClick={() => copiarAlPortapapeles(reporte.hashRaizFinal, 'Sello Raíz')}
                                className="p-1 text-slate-500 hover:text-white transition"
                                title="Copiar Sello Raíz"
                            >
                                {copiadoHash === reporte.hashRaizFinal ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                        <span className="text-[11px] text-slate-500 block">Firma del último voto depositado</span>
                    </div>
                </div>
            )}

            {/* Visualizador de Bloques de la Cadena */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Activity className="w-4 h-4 text-cyan-400" />
                        <span>Trazabilidad de Bloques Criptográficos</span>
                    </h3>
                    <span className="text-xs text-slate-400 font-mono">
                        {reporte?.bloques?.length || 0} Registros
                    </span>
                </div>

                {loading ? (
                    <div className="text-center py-12 text-slate-400 text-xs space-y-3">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-cyan-400" />
                        <span>Verificando matemáticamente cada eslabón de la cadena de votos...</span>
                    </div>
                ) : !reporte || reporte.bloques.length === 0 ? (
                    <div className="text-center py-12 rounded-xl border border-slate-800/80 bg-slate-950/40 text-slate-500 text-xs">
                        Aún no se han depositado sufragios en esta jornada electoral para construir la cadena.
                    </div>
                ) : (
                    <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                        {reporte.bloques.map((bloque, idx) => (
                            <React.Fragment key={bloque.idVoto}>
                                <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/90 hover:border-cyan-500/40 transition text-xs space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="px-2.5 py-0.5 rounded-lg bg-cyan-950/80 text-cyan-300 font-mono font-bold text-[11px] border border-cyan-800/60">
                                                Bloque #{bloque.secuencia}
                                            </span>
                                            <span className="text-[11px] text-slate-400 font-mono">
                                                ID: {bloque.idVoto.substring(0, 8)}...
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-semibold">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            <span>Enlace Válido</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono pt-1 border-t border-slate-900">
                                        <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                                            <span className="text-slate-500 text-[10px] block font-sans">
                                                Hash Bloque Anterior (Prev Hash):
                                            </span>
                                            <span className="text-slate-300 break-all">{bloque.prevHash}</span>
                                        </div>
                                        <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800">
                                            <span className="text-slate-500 text-[10px] block font-sans">
                                                Hash del Sufragio (Voto Hash):
                                            </span>
                                            <span className="text-cyan-300 break-all">{bloque.votoHash}</span>
                                        </div>
                                    </div>
                                </div>

                                {idx < reporte.bloques.length - 1 && (
                                    <div className="flex justify-center py-0.5">
                                        <div className="p-1 rounded-full bg-slate-900/90 border border-slate-800 text-cyan-400">
                                            <ArrowDown className="w-3.5 h-3.5" />
                                        </div>
                                    </div>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
