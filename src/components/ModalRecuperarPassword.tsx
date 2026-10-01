import React, { useState } from 'react';
import { KeyRound, ShieldCheck, Mail, AlertCircle, ArrowLeft, CheckCircle2, RefreshCw, X, User } from 'lucide-react';
import { useToast } from './Toast';
import { getTelemetryHeaders } from '../utils/deviceFingerprint';

interface ModalRecuperarPasswordProps {
    isOpen: boolean;
    onClose: () => void;
    onRecuperacionCompletada?: (documento: string) => void;
}

export const ModalRecuperarPassword: React.FC<ModalRecuperarPasswordProps> = ({
    isOpen,
    onClose,
    onRecuperacionCompletada,
}) => {
    const toast = useToast();
    const [documento, setDocumento] = useState('');
    const [cargando, setCargando] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [exitoData, setExitoData] = useState<{
        mensaje: string;
        correoEnmascarado: string;
        emailSimulado?: boolean;
    } | null>(null);

    if (!isOpen) return null;

    const handleSolicitarRecuperacion = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);

        const docLimpio = documento.trim();
        if (!docLimpio) {
            setErrorMsg('Por favor ingresa tu número de documento de identidad.');
            return;
        }

        setCargando(true);
        try {
            const telemetryHeaders = await getTelemetryHeaders();
            const res = await fetch('/api/auth/recuperar-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...telemetryHeaders,
                },
                body: JSON.stringify({
                    documentoIdentidad: docLimpio,
                }),
            });

            let data: any = {};
            try {
                data = await res.json();
            } catch {
                throw new Error('Error al procesar la respuesta del servidor electoral.');
            }

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'No fue posible procesar el restablecimiento de contraseña.');
            }

            setExitoData({
                mensaje: data.mensaje,
                correoEnmascarado: data.correoEnmascarado || 'tu correo registrado',
                emailSimulado: data.emailSimulado,
            });

            toast.success('Nueva clave temporal despachada a tu correo institucional.', 'Clave Generada');
        } catch (err: any) {
            setErrorMsg(err.message);
            toast.error(err.message, 'Fallo de Recuperación');
        } finally {
            setCargando(false);
        }
    };

    const handleCerrarYVolver = () => {
        const docTemp = documento.trim();
        setExitoData(null);
        setErrorMsg(null);
        setDocumento('');
        onClose();
        if (onRecuperacionCompletada && docTemp) {
            onRecuperacionCompletada(docTemp);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="max-w-md w-full glass-panel border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl bg-slate-950/95 relative overflow-hidden">
                {/* Botón de cierre */}
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 text-slate-400 hover:text-white transition p-1.5 rounded-full hover:bg-slate-800/60 cursor-pointer"
                    title="Cerrar modal"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Encabezado */}
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-cyan-950/80 border border-cyan-700/60 rounded-2xl text-cyan-400 shadow-md shadow-cyan-950/40">
                        <KeyRound className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-white tracking-tight">Recuperar Contraseña</h2>
                        <p className="text-xs text-slate-400">Restablecimiento de credenciales de votante</p>
                    </div>
                </div>

                {!exitoData ? (
                    <form onSubmit={handleSolicitarRecuperacion} className="space-y-4">
                        <p className="text-xs text-slate-300 leading-relaxed">
                            Ingresa tu documento de identidad registrado. Generaremos una <strong>nueva contraseña temporal</strong> y la enviaremos directamente a tu correo institucional oficial.
                        </p>

                        {errorMsg && (
                            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-2 animate-shake">
                                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-slate-300">
                                Documento de Identidad / Cédula *
                            </label>
                            <div className="relative">
                                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                                <input
                                    type="text"
                                    required
                                    autoFocus
                                    value={documento}
                                    onChange={(e) => setDocumento(e.target.value)}
                                    placeholder="Ej: 1020304050"
                                    disabled={cargando}
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-700 focus:border-cyan-500 rounded-xl text-sm font-mono text-white placeholder-slate-500 outline-none transition"
                                />
                            </div>
                        </div>

                        {/* Aviso de Seguridad */}
                        <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                            <div className="flex items-center gap-1.5 text-cyan-400 font-semibold">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Seguridad del Censo Electoral:</span>
                            </div>
                            <p className="leading-normal">
                                Si ya ejerciste tu voto en esta jornada, por principio de inmutabilidad y secreto del sufragio no se emitirán nuevas credenciales.
                            </p>
                        </div>

                        <div className="flex gap-2.5 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={cargando}
                                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 transition cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={cargando || !documento.trim()}
                                className="flex-1 py-2.5 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-lg shadow-cyan-950/60 flex items-center justify-center gap-2"
                            >
                                {cargando ? (
                                    <>
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                        <span>Verificando...</span>
                                    </>
                                ) : (
                                    <>
                                        <Mail className="w-3.5 h-3.5" />
                                        <span>Enviar Nueva Clave</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                ) : (
                    /* Pantalla de Éxito */
                    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-700/60 text-emerald-200 text-xs space-y-2">
                            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                                <CheckCircle2 className="w-5 h-5 shrink-0" />
                                <span>¡Contraseña Temporal Despachada!</span>
                            </div>
                            <p className="leading-relaxed text-slate-300 text-xs">
                                Hemos enviado la nueva clave de acceso al correo institucional:
                            </p>
                            <div className="p-2.5 rounded-lg bg-slate-950 border border-emerald-900/60 font-mono text-emerald-300 text-xs text-center font-bold">
                                📧 {exitoData.correoEnmascarado}
                            </div>
                            {exitoData.emailSimulado && (
                                <p className="text-[10px] text-amber-300/90 italic">
                                    (Modo Simulación Local: Revisa los logs del servidor para ver la clave generada).
                                </p>
                            )}
                        </div>

                        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 space-y-1.5">
                            <strong className="text-white block font-semibold">Pasos siguientes:</strong>
                            <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px]">
                                <li>Abre tu bandeja de entrada institucional.</li>
                                <li>Copia la contraseña temporal que te enviamos.</li>
                                <li>Inicia sesión: el sistema te solicitará <strong>definir tu nueva contraseña personal</strong>.</li>
                            </ol>
                        </div>

                        <button
                            type="button"
                            onClick={handleCerrarYVolver}
                            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-lg shadow-emerald-950/60 flex items-center justify-center gap-2"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>Regresar al Inicio de Sesión</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
