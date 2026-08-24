import React, { useState } from 'react';
import { Shield, Lock, UserCheck, KeyRound, User, AlertCircle } from 'lucide-react';

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

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Credenciales inválidas.');
            }

            if (data.usuario.rol !== rolSeleccionado) {
                throw new Error(`Este usuario pertenece al rol ${data.usuario.rol}, no a ${rolSeleccionado}.`);
            }

            // Persistencia en almacenamiento para todos los módulos
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
        <div className="max-w-md mx-auto p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl space-y-6">
            <div className="text-center space-y-2">
                <h2 className="text-xl font-bold text-white">Acceso al Sistema Electoral</h2>
                <p className="text-xs text-slate-400">Identificación institucional y control de roles</p>
            </div>

            <div className="grid grid-cols-3 gap-2">
                <button
                    type="button"
                    onClick={() => { setRolSeleccionado('VOTANTE'); setError(null); }}
                    className={`p-3 rounded-xl border flex flex-col items-center space-y-1.5 transition ${rolSeleccionado === 'VOTANTE'
                        ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                >
                    <UserCheck className="w-5 h-5" />
                    <span className="text-xs font-medium">Votante</span>
                </button>

                <button
                    type="button"
                    onClick={() => { setRolSeleccionado('AUDITOR'); setError(null); }}
                    className={`p-3 rounded-xl border flex flex-col items-center space-y-1.5 transition ${rolSeleccionado === 'AUDITOR'
                        ? 'bg-cyan-950/80 border-cyan-500 text-cyan-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                >
                    <Shield className="w-5 h-5" />
                    <span className="text-xs font-medium">Auditor</span>
                </button>

                <button
                    type="button"
                    onClick={() => { setRolSeleccionado('ADMIN'); setError(null); }}
                    className={`p-3 rounded-xl border flex flex-col items-center space-y-1.5 transition ${rolSeleccionado === 'ADMIN'
                        ? 'bg-rose-950/80 border-rose-500 text-rose-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                >
                    <Lock className="w-5 h-5" />
                    <span className="text-xs font-medium">Admin</span>
                </button>
            </div>

            <form onSubmit={handleIngreso} className="space-y-4 text-xs">
                {rolSeleccionado !== 'VOTANTE' ? (
                    <>
                        <div>
                            <label className="block font-medium text-slate-300 mb-1">Cédula / Documento</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={documento}
                                    onChange={(e) => setDocumento(e.target.value)}
                                    placeholder={rolSeleccionado === 'ADMIN' ? '12345678' : '1098700002'}
                                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono outline-none focus:border-cyan-500"
                                    required
                                />
                                <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                            </div>
                        </div>

                        <div>
                            <label className="block font-medium text-slate-300 mb-1">Contraseña Personal</label>
                            <div className="relative">
                                <input
                                    type="password"
                                    value={clave}
                                    onChange={(e) => setClave(e.target.value)}
                                    placeholder="••••••••••••"
                                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono outline-none focus:border-cyan-500"
                                    required
                                />
                                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                            </div>
                        </div>
                    </>
                ) : (
                    <p className="text-slate-400 text-center py-2">
                        El acceso de votantes no requiere credenciales de staff; ingresarás con tu cédula y código 2FA.
                    </p>
                )}

                {error && (
                    <div className="p-3 bg-rose-950/50 border border-rose-800/80 rounded-lg flex items-center space-x-2 text-rose-300">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white font-semibold rounded-xl transition cursor-pointer"
                >
                    {loading ? 'Validando...' : rolSeleccionado === 'VOTANTE' ? 'Ingresar a Cabina' : 'Iniciar Sesión Institucional'}
                </button>
            </form>
        </div>
    );
};