import React, { useState } from 'react';
import { ShieldCheck, Lock, User, KeyRound, Copy, Check } from 'lucide-react';

interface LoginVotanteProps {
    onLoginExitoso: (tokenVotacion: string, eleccionActivaId: string) => void;
}

export const LoginVotante: React.FC<LoginVotanteProps> = ({ onLoginExitoso }) => {
    const [documento, setDocumento] = useState('');
    const [password, setPassword] = useState('');
    const [codigoMfa, setCodigoMfa] = useState('');

    const [pasoMfa, setPasoMfa] = useState(false);
    const [challengeToken, setChallengeToken] = useState<string | null>(null);
    const [qrCodeData, setQrCodeData] = useState<string | null>(null);
    const [manualKey, setManualKey] = useState<string | null>(null);
    const [copiado, setCopiado] = useState(false);

    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const handleValidarCredenciales = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setLoading(true);

        try {
            const res = await fetch('/api/auth/login-paso1', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentoIdentidad: documento.trim(), password }),
            });

            let data: any = {};
            try {
                data = await res.json();
            } catch {
                throw new Error('Error al procesar la respuesta del censo electoral.');
            }

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Credenciales inválidas o elector inhabilitado');
            }

            setChallengeToken(data.challengeToken);
            setQrCodeData(data.qrCode || null);
            setManualKey(data.manualKey || null);
            setPasoMfa(true);
        } catch (err: any) {
            setErrorMsg(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleValidarMfa = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setLoading(true);

        try {
            const res = await fetch('/api/auth/login-paso2-mfa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    challengeToken,
                    codigoMfa: codigoMfa.trim(),
                }),
            });

            let data: any = {};
            try {
                data = await res.json();
            } catch {
                throw new Error('Error al conectar con la urna digital.');
            }

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Código de seguridad incorrecto o expirado');
            }

            onLoginExitoso(data.tokenVotacion, data.eleccionId);
        } catch (err: any) {
            setErrorMsg(err.message);
        } finally {
            setLoading(false);
        }
    };

    const copiarClave = () => {
        if (manualKey) {
            navigator.clipboard.writeText(manualKey);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2000);
        }
    };

    return (
        <div className="min-h-[85vh] flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur">
                <div className="text-center mb-6">
                    <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-400">
                        <ShieldCheck className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Elecciones Sindicales</h1>
                    <p className="text-sm text-slate-400 mt-1">Portal Oficial de Votación Segura</p>
                </div>

                {errorMsg && (
                    <div className="mb-6 p-3.5 bg-red-950/60 border border-red-800/80 text-red-300 rounded-lg text-xs leading-relaxed">
                        {errorMsg}
                    </div>
                )}

                {!pasoMfa ? (
                    <form onSubmit={handleValidarCredenciales} className="space-y-5">
                        <div>
                            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                                Documento de Identidad
                            </label>
                            <div className="relative">
                                <User className="w-5 h-5 text-slate-500 absolute left-3.5 top-3.5" />
                                <input
                                    type="text"
                                    required
                                    value={documento}
                                    onChange={(e) => setDocumento(e.target.value)}
                                    placeholder="Ej. 1098765432"
                                    className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500 transition"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                                Contraseña
                            </label>
                            <div className="relative">
                                <Lock className="w-5 h-5 text-slate-500 absolute left-3.5 top-3.5" />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••••••"
                                    className="w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500 transition"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-semibold rounded-lg text-sm transition shadow-lg shadow-emerald-900/20 cursor-pointer disabled:cursor-not-allowed"
                        >
                            {loading ? 'Verificando Censo...' : 'Siguiente Paso →'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleValidarMfa} className="space-y-5">
                        {qrCodeData && (
                            <div className="flex flex-col items-center p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                                <div className="p-2 bg-white rounded-lg shadow">
                                    <img src={qrCodeData} alt="Código QR 2FA" className="w-40 h-40" />
                                </div>
                                <p className="text-xs text-slate-400 text-center">
                                    Escanea este código con tu app de autenticación (Google/Microsoft Authenticator)
                                </p>
                                {manualKey && (
                                    <button
                                        type="button"
                                        onClick={copiarClave}
                                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-md transition"
                                    >
                                        {copiado ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                        <span>{copiado ? 'Clave copiada' : 'Copiar clave manual'}</span>
                                    </button>
                                )}
                            </div>
                        )}

                        {!qrCodeData && (
                            <div className="text-center p-3 bg-slate-950 rounded-lg border border-slate-800 mb-2">
                                <KeyRound className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
                                <span className="text-xs text-slate-400">
                                    Ingresa el código de 6 dígitos generado en tu aplicación.
                                </span>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 text-center">
                                Código de Seguridad (2FA)
                            </label>
                            <input
                                type="text"
                                maxLength={6}
                                required
                                autoFocus
                                value={codigoMfa}
                                onChange={(e) => setCodigoMfa(e.target.value.replace(/\D/g, ''))}
                                placeholder="000000"
                                className="w-full text-center tracking-[0.5em] text-2xl font-mono py-3 bg-slate-950 border border-slate-800 rounded-lg text-emerald-400 focus:outline-none focus:border-emerald-500 transition"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setPasoMfa(false);
                                    setCodigoMfa('');
                                }}
                                disabled={loading}
                                className="w-1/3 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg text-xs transition cursor-pointer"
                            >
                                ← Volver
                            </button>
                            <button
                                type="submit"
                                disabled={loading || codigoMfa.length !== 6}
                                className="w-2/3 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-semibold rounded-lg text-xs transition shadow-lg shadow-emerald-900/20 cursor-pointer disabled:cursor-not-allowed"
                            >
                                {loading ? 'Ingresando a Cabina...' : 'Habilitar Voto'}
                            </button>
                        </div>
                    </form>
                )}

                <div className="mt-8 text-center border-t border-slate-800/80 pt-4">
                    <p className="text-[11px] text-slate-400">
                        Canal de votación seguro | Tu identidad permanece disociada y protegida tras la entrega de la papeleta.
                    </p>
                </div>
            </div>
        </div>
    );
};