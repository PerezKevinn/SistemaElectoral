import React, { useState, useEffect } from 'react';
import {
    Lock,
    ShieldAlert,
    CheckCircle2,
    AlertCircle,
    ArrowLeft,
    KeySquare,
    Eye,
    EyeOff,
    Check,
    Copy,
    RefreshCw,
    ChevronDown,
    FileText,
    AlertTriangle,
    Layers,
    Hash
} from 'lucide-react';
import { useToast } from './Toast';

export interface EleccionItem {
    id_eleccion: string;
    titulo: string;
    descripcion?: string;
    estado: string;
    creado_at?: string;
    fecha_inicio?: string;
    fecha_fin?: string;
}

interface CierreResult {
    estado: string;
    totalVotosSellados: number;
    selloFinalHash: string;
    cerradoAt: string;
}

interface PanelAdminCierreProps {
    eleccionId?: string;
    listaElecciones?: EleccionItem[];
    onCambiarEleccion?: (id: string) => void;
    onVolver: () => void;
    onCierreCompletado?: () => void;
}

export const PanelAdminCierre: React.FC<PanelAdminCierreProps> = ({
    eleccionId = '',
    listaElecciones = [],
    onCambiarEleccion,
    onVolver,
    onCierreCompletado,
}) => {
    const toast = useToast();
    const [elecciones, setElecciones] = useState<EleccionItem[]>(listaElecciones);
    const [loadingElecciones, setLoadingElecciones] = useState<boolean>(false);
    const [selectedId, setSelectedId] = useState<string>(eleccionId);
    const [modoManual, setModoManual] = useState<boolean>(false);
    const [manualId, setManualId] = useState<string>('');
    const [clave, setClave] = useState<string>('');
    const [mostrarClave, setMostrarClave] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(false);
    const [resultado, setResultado] = useState<CierreResult | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [copiado, setCopiado] = useState<boolean>(false);

    // Cargar elecciones desde el backend si no fueron provistas por props
    const cargarElecciones = async () => {
        setLoadingElecciones(true);
        try {
            const token = sessionStorage.getItem('staff_token');
            const res = await fetch('/api/urna/elecciones', {
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            });
            if (res.ok) {
                const data = await res.json();
                if (data.success && Array.isArray(data.elecciones)) {
                    setElecciones(data.elecciones);
                    if (!selectedId && data.elecciones.length > 0) {
                        const abierta = data.elecciones.find((e: EleccionItem) => e.estado === 'ABIERTA') || data.elecciones[0];
                        setSelectedId(abierta.id_eleccion);
                        if (onCambiarEleccion) onCambiarEleccion(abierta.id_eleccion);
                    }
                }
            }
        } catch (err) {
            console.error('Error al cargar lista de elecciones en Cierre:', err);
        } finally {
            setLoadingElecciones(false);
        }
    };

    useEffect(() => {
        if (listaElecciones && listaElecciones.length > 0) {
            setElecciones(listaElecciones);
        } else {
            cargarElecciones();
        }
    }, [listaElecciones]);

    useEffect(() => {
        if (eleccionId) {
            setSelectedId(eleccionId);
        } else if (elecciones.length > 0 && !selectedId) {
            const abierta = elecciones.find((e) => e.estado === 'ABIERTA') || elecciones[0];
            setSelectedId(abierta.id_eleccion);
        }
    }, [eleccionId, elecciones]);

    const idFinal = modoManual ? manualId.trim() : selectedId;
    const eleccionSeleccionada = elecciones.find((e) => e.id_eleccion === idFinal);
    const estaCerrada = eleccionSeleccionada?.estado === 'CERRADA';

    const handleSelectChange = (id: string) => {
        setSelectedId(id);
        setErrorMsg(null);
        if (onCambiarEleccion) {
            onCambiarEleccion(id);
        }
    };

    const handleCopiarId = (id: string) => {
        navigator.clipboard.writeText(id);
        setCopiado(true);
        toast.info('ID de elección copiado al portapapeles', 'Copiado');
        setTimeout(() => setCopiado(false), 2000);
    };

    const handleCerrar = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        if (!idFinal) {
            setErrorMsg('Por favor selecciona o ingresa el ID de la jornada electoral a clausurar.');
            toast.error('Selecciona una jornada electoral', 'Falta ID de Elección');
            return;
        }

        if (!clave.trim()) {
            setErrorMsg('Por favor ingresa tu contraseña de confirmación de administrador.');
            return;
        }

        if (estaCerrada) {
            setErrorMsg('La jornada seleccionada ya se encuentra clausurada y sellada.');
            return;
        }

        setLoading(true);

        try {
            const token = sessionStorage.getItem('staff_token');
            const res = await fetch('/api/urna/cerrar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    eleccionId: idFinal,
                    adminClave: clave.trim(),
                }),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Error al ejecutar el cierre oficial de la urna');
            }

            setResultado(data.data);
            toast.success('La jornada electoral ha sido sellada y clausurada oficialmente.', 'Urna Sellada');
            
            // Actualizar lista local de elecciones
            setElecciones((prev) =>
                prev.map((el) => (el.id_eleccion === idFinal ? { ...el, estado: 'CERRADA' } : el))
            );

            if (onCierreCompletado) {
                onCierreCompletado();
            }
        } catch (err: any) {
            setErrorMsg(err.message);
            toast.error(err.message, 'Fallo en Cierre de Jornada');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto glass-panel p-4 sm:p-6 lg:p-8 rounded-2xl shadow-2xl space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-5 gap-3">
                <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400">
                        <Lock className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">Cierre Oficial de Jornada</h2>
                        <p className="text-xs text-slate-400">Control de custodia y sellado definitivo de la urna</p>
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

            {!resultado ? (
                <form onSubmit={handleCerrar} className="space-y-6">
                    {/* Irreversible Warning Banner */}
                    <div className="p-4 bg-rose-950/30 border border-rose-800/50 rounded-xl flex items-start space-x-3 text-xs text-rose-200">
                        <ShieldAlert className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
                        <p className="leading-relaxed">
                            Esta acción es <strong>irreversible</strong>. Una vez ejecutado el cierre, la urna digital
                            quedará sellada con un eslabón criptográfico raíz inmutable y <strong>no se recibirán más votos ni se emitirán tokens</strong>.
                        </p>
                    </div>

                    {/* SECCIÓN: Selección o Ingreso de Elección */}
                    <div className="p-4 sm:p-5 bg-slate-900/70 border border-slate-800/90 rounded-2xl space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                                <Layers className="w-4 h-4 text-indigo-400" />
                                <label className="text-xs font-bold uppercase tracking-wider text-slate-200">
                                    Jornada Electoral a Clausurar
                                </label>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setModoManual(!modoManual)}
                                    className="text-[11px] text-indigo-400 hover:text-indigo-300 underline font-medium transition cursor-pointer"
                                >
                                    {modoManual ? 'Seleccionar de lista' : 'Ingresar ID manualmente'}
                                </button>
                                <button
                                    type="button"
                                    onClick={cargarElecciones}
                                    disabled={loadingElecciones}
                                    title="Recargar lista de elecciones"
                                    className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${loadingElecciones ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                        </div>

                        {!modoManual ? (
                            <div>
                                {elecciones.length > 0 ? (
                                    <div className="relative">
                                        <select
                                            value={selectedId}
                                            onChange={(e) => handleSelectChange(e.target.value)}
                                            className="w-full appearance-none px-3.5 py-2.5 bg-slate-950 border border-slate-700 hover:border-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-xs sm:text-sm text-slate-200 outline-none transition font-medium cursor-pointer pr-10"
                                        >
                                            <option value="" disabled>-- Selecciona una elección --</option>
                                            {elecciones.map((el) => (
                                                <option key={el.id_eleccion} value={el.id_eleccion}>
                                                    [{el.estado}] {el.titulo}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                                            <ChevronDown className="w-4 h-4" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-3 bg-amber-950/20 border border-amber-800/40 rounded-xl text-xs text-amber-300 flex items-center justify-between">
                                        <span>No se encontraron jornadas registradas en la base de datos.</span>
                                        <button
                                            type="button"
                                            onClick={() => setModoManual(true)}
                                            className="px-2 py-1 bg-amber-900/40 hover:bg-amber-900/60 rounded text-[11px] font-semibold text-amber-200 transition cursor-pointer"
                                        >
                                            Ingresar ID
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div>
                                <label className="block text-[11px] font-mono text-slate-400 mb-1.5">
                                    UUID o Identificador de Elección
                                </label>
                                <div className="relative">
                                    <Hash className="w-4 h-4 text-slate-500 absolute left-3.5 top-3 pointer-events-none" />
                                    <input
                                        type="text"
                                        value={manualId}
                                        onChange={(e) => setManualId(e.target.value)}
                                        placeholder="Ej: a1b2c3d4-e5f6-7890-abcd-ef1234567890"
                                        className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-xs sm:text-sm text-slate-200 placeholder-slate-600 outline-none transition font-mono"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Tarjeta Resumen de la Elección Seleccionada */}
                        {idFinal && (
                            <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-semibold text-slate-200 truncate">
                                        {eleccionSeleccionada?.titulo || 'Identificador de Elección Seleccionado'}
                                    </span>
                                    {eleccionSeleccionada ? (
                                        <span
                                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${eleccionSeleccionada.estado === 'ABIERTA'
                                                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                                                }`}
                                        >
                                            {eleccionSeleccionada.estado}
                                        </span>
                                    ) : (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-950/60 text-indigo-300 border border-indigo-800/50">
                                            ID Manual
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-900 text-[11px] font-mono text-slate-400">
                                    <span className="truncate" title={idFinal}>
                                        ID: <span className="text-slate-300">{idFinal}</span>
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleCopiarId(idFinal)}
                                        className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-indigo-300 px-2 py-0.5 bg-slate-900 rounded border border-slate-800 transition cursor-pointer"
                                        title="Copiar ID al portapapeles"
                                    >
                                        {copiado ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                        <span>{copiado ? 'Copiado' : 'Copiar'}</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {estaCerrada && (
                            <div className="p-3 bg-amber-950/30 border border-amber-800/60 rounded-xl flex items-center space-x-2 text-amber-300 text-xs">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-400" />
                                <span>Esta elección ya se encuentra <strong>CERRADA y sellada</strong>. No es posible ejecutar un nuevo cierre sobre ella.</span>
                            </div>
                        )}
                    </div>

                    {/* SECCIÓN: Contraseña de Administrador */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-semibold text-slate-300">
                                Contraseña de Confirmación de Administrador
                            </label>
                            <span className="text-[10px] font-mono text-slate-500">Clave de tu cuenta</span>
                        </div>
                        <div className="relative">
                            <KeySquare className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5 pointer-events-none" />
                            <input
                                type={mostrarClave ? 'text' : 'password'}
                                value={clave}
                                onChange={(e) => setClave(e.target.value)}
                                placeholder="Ingresa tu contraseña de inicio de sesión de Admin"
                                className="w-full pl-10 pr-10 py-3 bg-slate-950/80 border border-slate-800 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 rounded-xl text-xs sm:text-sm text-slate-200 placeholder-slate-600 outline-none transition font-mono"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setMostrarClave(!mostrarClave)}
                                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition focus:outline-none cursor-pointer"
                                title={mostrarClave ? 'Ocultar clave' : 'Ver clave'}
                                aria-label={mostrarClave ? 'Ocultar clave' : 'Ver clave'}
                            >
                                {mostrarClave ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        <span className="text-[11px] text-slate-500 mt-1.5 block">
                            Por seguridad institucional, ingresa la misma contraseña con la que iniciaste sesión como Administrador para autorizar el sellado definitivo.
                        </span>
                    </div>

                    {/* Mensaje de Error */}
                    {errorMsg && (
                        <div className="p-3.5 bg-rose-950/60 border border-rose-800/80 rounded-xl flex items-center space-x-2 text-red-300 text-xs">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {/* Botón de Acción Principal */}
                    <button
                        type="submit"
                        disabled={loading || !clave || !idFinal || estaCerrada}
                        className="w-full py-3.5 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl transition cursor-pointer disabled:cursor-not-allowed shadow-lg shadow-rose-950/60"
                    >
                        {loading ? 'Sellando Urna Definitivamente...' : 'Proceder con el Cierre Electoral'}
                    </button>
                </form>
            ) : (
                <div className="p-5 bg-slate-950/80 border border-emerald-800/80 rounded-xl space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-center space-x-2 text-emerald-400">
                        <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                        <h3 className="font-bold text-sm text-emerald-200">Elección Cerrada y Sellada Oficialmente</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl">
                            <span className="text-slate-400 block mb-1">Total Votos Sellados</span>
                            <span className="font-mono text-white text-lg font-bold">{resultado.totalVotosSellados}</span>
                        </div>
                        <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl">
                            <span className="text-slate-400 block mb-1">Fecha/Hora de Cierre</span>
                            <span className="font-mono text-slate-200 text-sm font-semibold">
                                {resultado.cerradoAt ? new Date(resultado.cerradoAt).toLocaleTimeString() : 'Inmediato'}
                            </span>
                        </div>
                    </div>

                    <div className="p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl">
                        <span className="text-slate-400 block mb-1 text-[11px] font-semibold uppercase tracking-wider">
                            Sello Digital de Cierre (Eslabón Inmutable)
                        </span>
                        <p className="font-mono text-[11px] text-cyan-400 break-all">{resultado.selloFinalHash}</p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onVolver}
                            className="w-full sm:w-1/2 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
                        >
                            Volver al Escrutinio
                        </button>
                        {onCierreCompletado && (
                            <button
                                type="button"
                                onClick={onCierreCompletado}
                                className="w-full sm:w-1/2 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-lg shadow-emerald-950/50"
                            >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Ver Acta Oficial</span>
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};