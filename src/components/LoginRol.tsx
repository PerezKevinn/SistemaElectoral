import React, { useState } from 'react';
import { Shield, Lock, UserCheck, KeyRound, User, AlertCircle, ShieldCheck, CheckCircle2, ChevronRight, Fingerprint, LockKeyhole } from 'lucide-react';

type Rol = 'VOTANTE' | 'AUDITOR' | 'ADMIN';

interface FuncionarioData {
    documento: string;
    nombre: string;
    cargo: string;
    rol: Rol;
}

interface LoginRolProps {
    onAccesoConcedido: (rol: Rol, usuario?: FuncionarioData, token?: string) => void;
}

export const LoginRol: React.FC<LoginRolProps> = ({ onAccesoConcedido }) => {
    const [rolSeleccionado, setRolSeleccionado] = useState<Rol>('VOTANTE');
    const [documento, setDocumento] = useState('');
    const [clave, setClave] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleIngreso = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (rolSeleccionado === 'VOTANTE') {
            onAccesoConcedido('VOTANTE');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/urna/login-staff', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    documento: documento.trim(),
                    clave: clave.trim(),
                    rol: rolSeleccionado
                }),
            });

            let data: any = {};
            try {
                data = await res.json();
            } catch {
                throw new Error('Error al conectar con el servidor backend.');
            }

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Credenciales inválidas.');
            }

            if (data.usuario.rol !== rolSeleccionado) {
                throw new Error(`Este usuario pertenece al rol ${data.usuario.rol}, no a ${rolSeleccionado}.`);
            }

            localStorage.setItem('auth_token', data.token);
            localStorage.setItem('staff_token', data.token);
            sessionStorage.setItem('staff_token', data.token);
            sessionStorage.setItem('staff_user', JSON.stringify(data.usuario));

            onAccesoConcedido(data.usuario.rol, data.usuario, data.token);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-xl mx-auto">
            {/* Main Institutional Card */}
            <div className="glass-panel rounded-2xl p-7 sm:p-9 shadow-2xl relative overflow-hidden border border-slate-700/60">
                {/* Subtle top accent line */}
                <div className={`absolute top-0 left-0 right-0 h-1 transition-all duration-300 ${rolSeleccionado === 'VOTANTE' ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600' :
                    rolSeleccionado === 'AUDITOR' ? 'bg-gradient-to-r from-cyan-500 via-blue-400 to-cyan-600' :
                        'bg-gradient-to-r from-indigo-500 via-purple-400 to-rose-500'
                    }`} />

                {/* Institutional Header */}
                <div className="text-center space-y-3 mb-8">
                    <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-inner mb-1">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-950 to-slate-900 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-md">
                            <ShieldCheck className="w-7 h-7 text-indigo-400" />
                        </div>
                    </div>

                    <div>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold tracking-widest uppercase bg-indigo-950/70 text-indigo-300 border border-indigo-800/60 mb-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                            Acceso Oficial Autorizado
                        </span>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                            Acceso al Sistema Electoral
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mt-1.5">
                            Identificación institucional y control de roles bajo protocolo de auditoría continua
                        </p>
                    </div>
                </div>

                {/* Role Selector Tabs */}
                <div className="space-y-2 mb-6">
                    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Seleccione su Perfil Institucional
                    </label>
                    <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                        {/* BOTÓN VOTANTE */}
                        <button
                            type="button"
                            onClick={() => { setRolSeleccionado('VOTANTE'); setError(null); }}
                            className={`group relative p-3.5 sm:p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${rolSeleccionado === 'VOTANTE'
                                ? 'bg-emerald-950/40 border-emerald-500/80 ring-1 ring-emerald-500/40 shadow-lg shadow-emerald-950/50'
                                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                                }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className={`p-2 rounded-lg ${rolSeleccionado === 'VOTANTE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800/80 text-slate-400 group-hover:text-slate-300'
                                    }`}>
                                    <UserCheck className="w-5 h-5" />
                                </div>
                                {rolSeleccionado === 'VOTANTE' && (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                )}
                            </div>
                            <div>
                                <span className={`text-xs sm:text-sm font-semibold block ${rolSeleccionado === 'VOTANTE' ? 'text-emerald-200' : 'text-slate-300'
                                    }`}>
                                    Votante
                                </span>
                                <span className="text-[10px] text-slate-400 block mt-0.5">
                                    Padrón General
                                </span>
                            </div>
                        </button>

                        {/* BOTÓN AUDITOR */}
                        <button
                            type="button"
                            onClick={() => { setRolSeleccionado('AUDITOR'); setError(null); }}
                            className={`group relative p-3.5 sm:p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${rolSeleccionado === 'AUDITOR'
                                ? 'bg-cyan-950/40 border-cyan-500/80 ring-1 ring-cyan-500/40 shadow-lg shadow-cyan-950/50'
                                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                                }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className={`p-2 rounded-lg ${rolSeleccionado === 'AUDITOR' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-800/80 text-slate-400 group-hover:text-slate-300'
                                    }`}>
                                    <Shield className="w-5 h-5" />
                                </div>
                                {rolSeleccionado === 'AUDITOR' && (
                                    <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                                )}
                            </div>
                            <div>
                                <span className={`text-xs sm:text-sm font-semibold block ${rolSeleccionado === 'AUDITOR' ? 'text-cyan-200' : 'text-slate-300'
                                    }`}>
                                    Auditor
                                </span>
                                <span className="text-[10px] text-slate-400 block mt-0.5">
                                    Garante Oficial
                                </span>
                            </div>
                        </button>

                        {/* BOTÓN ADMIN */}
                        <button
                            type="button"
                            onClick={() => { setRolSeleccionado('ADMIN'); setError(null); }}
                            className={`group relative p-3.5 sm:p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between ${rolSeleccionado === 'ADMIN'
                                ? 'bg-indigo-950/40 border-indigo-500/80 ring-1 ring-indigo-500/40 shadow-lg shadow-indigo-950/50'
                                : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                                }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className={`p-2 rounded-lg ${rolSeleccionado === 'ADMIN' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800/80 text-slate-400 group-hover:text-slate-300'
                                    }`}>
                                    <LockKeyhole className="w-5 h-5" />
                                </div>
                                {rolSeleccionado === 'ADMIN' && (
                                    <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                                )}
                            </div>
                            <div>
                                <span className={`text-xs sm:text-sm font-semibold block ${rolSeleccionado === 'ADMIN' ? 'text-indigo-200' : 'text-slate-300'
                                    }`}>
                                    Admin
                                </span>
                                <span className="text-[10px] text-slate-400 block mt-0.5">
                                    Mesa Directiva
                                </span>
                            </div>
                        </button>
                    </div>
                </div>

                {/* FORMULARIO O INFORMACIÓN */}
                <form onSubmit={handleIngreso} className="space-y-4">
                    {rolSeleccionado !== 'VOTANTE' ? (
                        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/90 space-y-4">
                            <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="text-xs font-semibold text-slate-300">
                                        Cédula / Documento de Identidad
                                    </label>
                                    <span className="text-[10px] font-mono text-slate-500">Obligatorio</span>
                                </div>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                                        <User className="w-4 h-4" />
                                    </div>
                                    <input
                                        type="text"
                                        value={documento}
                                        onChange={(e) => setDocumento(e.target.value)}
                                        placeholder={rolSeleccionado === 'ADMIN' ? 'Ej. 12345678' : 'Ej. 1098700002'}
                                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-lg text-white font-mono text-xs sm:text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition shadow-inner"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="text-xs font-semibold text-slate-300">
                                        Contraseña Institucional
                                    </label>
                                    <span className="text-[10px] font-mono text-slate-500">Acceso Protegido</span>
                                </div>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                                        <KeyRound className="w-4 h-4" />
                                    </div>
                                    <input
                                        type="password"
                                        value={clave}
                                        onChange={(e) => setClave(e.target.value)}
                                        placeholder="••••••••••••"
                                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900/90 border border-slate-700/80 rounded-lg text-white font-mono text-xs sm:text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition shadow-inner"
                                        required
                                    />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-900/40 text-center space-y-2">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
                                <Fingerprint className="w-4 h-4" />
                            </div>
                            <h3 className="text-xs font-semibold text-emerald-200">
                                Acceso Universal de Electores
                            </h3>
                            <p className="text-[11px] text-slate-400 leading-relaxed max-w-sm mx-auto">
                                El padrón general accede mediante autenticación de 2 pasos (Cédula + Clave y Token MFA). El secreto de voto se preserva mediante aislamiento institucional del censo.
                            </p>
                        </div>
                    )}

                    {error && (
                        <div className="p-3.5 bg-rose-950/60 border border-rose-800/80 rounded-xl flex items-start space-x-2.5 text-rose-300 text-xs animate-in fade-in duration-200">
                            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <div className="leading-snug">{error}</div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3 px-4 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:cursor-not-allowed ${rolSeleccionado === 'VOTANTE'
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950/50'
                            : rolSeleccionado === 'AUDITOR'
                                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-950/50'
                                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-950/50'
                            } disabled:opacity-50`}
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Verificando credenciales...
                            </span>
                        ) : (
                            <>
                                <span>{rolSeleccionado === 'VOTANTE' ? 'Ingresar a Cabina Electoral' : 'Iniciar Sesión Institucional'}</span>
                                <ChevronRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </form>

                {/* Security Trust Note */}
                <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                    <div className="flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Conexión Segura y Protegida</span>
                    </div>
                    <span className="text-[10px] text-slate-500">Canal Oficial Auditado</span>
                </div>
            </div>
        </div>
    );
};
