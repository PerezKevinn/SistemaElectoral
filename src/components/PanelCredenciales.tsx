import React, { useState, useEffect } from 'react';
import { Users, UserPlus, KeyRound, CheckCircle2, XCircle, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';
import { useToast } from './Toast';

interface StaffUser {
    id: string;
    documento_identidad: string;
    nombres: string;
    apellidos: string;
    cargo: string;
    rol: 'ADMIN' | 'AUDITOR';
    esta_activo: boolean;
    created_at: string;
}

interface PanelCredencialesProps {
    onVolver: () => void;
}

export const PanelCredenciales: React.FC<PanelCredencialesProps> = ({ onVolver }) => {
    const toast = useToast();
    const [personal, setPersonal] = useState<StaffUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [mostrarModalCrear, setMostrarModalCrear] = useState(false);
    const [modalPasswordId, setModalPasswordId] = useState<string | null>(null);
    const [nuevaPassword, setNuevaPassword] = useState('');

    // Formulario nuevo usuario
    const [form, setForm] = useState({
        documento: '',
        nombres: '',
        apellidos: '',
        cargo: '',
        rol: 'AUDITOR' as 'ADMIN' | 'AUDITOR',
        password: '',
    });

    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [exitoMsg, setExitoMsg] = useState<string | null>(null);

    const getAuthHeaders = () => {
        const token = localStorage.getItem('auth_token') || sessionStorage.getItem('staff_token');
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        };
    };

    const cargarStaff = async () => {
        setLoading(true);
        setErrorMsg(null);
        try {
            const res = await fetch('/api/urna/staff', {
                headers: getAuthHeaders()
            });

            if (!res.ok) {
                let msg = `Error en el servidor (${res.status})`;
                try {
                    const errData = await res.json();
                    if (errData?.error) msg = errData.error;
                } catch {
                    if (res.status === 502 || res.status === 504) {
                        msg = 'No se pudo conectar con el servidor backend (puerto 4000). Asegúrate de que el servidor esté iniciado.';
                    }
                }
                throw new Error(msg);
            }

            const data = await res.json();
            if (data.success) {
                setPersonal(data.data || data.staff || []);
            } else {
                throw new Error(data.error || 'Error al obtener personal');
            }
        } catch (err: any) {
            console.error(err);
            setErrorMsg(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarStaff();
    }, []);

    const handleCrearUsuario = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setExitoMsg(null);

        try {
            const res = await fetch('/api/urna/staff/crear', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    documento_identidad: form.documento.trim(),
                    nombres: form.nombres.trim(),
                    apellidos: form.apellidos.trim(),
                    cargo: form.cargo.trim(),
                    rol: form.rol,
                    password: form.password.trim(),
                }),
            });

            let data: any = {};
            try {
                data = await res.json();
            } catch {
                throw new Error('Error de comunicación con el servidor.');
            }

            if (!res.ok || !data.success) throw new Error(data.error || 'Error al crear funcionario');

            toast.success('Funcionario registrado exitosamente en el censo electoral.', 'Personal Registrado');
            setExitoMsg('Funcionario registrado exitosamente.');
            setForm({ documento: '', nombres: '', apellidos: '', cargo: '', rol: 'AUDITOR', password: '' });
            setMostrarModalCrear(false);
            cargarStaff();
        } catch (err: any) {
            setErrorMsg(err.message);
            toast.error(err.message, 'Error al Crear Funcionario');
        }
    };

    const alternarEstado = async (id: string, estadoActual: boolean) => {
        try {
            const res = await fetch('/api/urna/staff/estado', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ idUsuario: id, activo: !estadoActual }),
            });
            let data: any = {};
            try { data = await res.json(); } catch { throw new Error('Error al conectar con el servidor'); }
            if (!res.ok || !data.success) throw new Error(data.error || 'Error al modificar estado');

            toast.success(
                `Funcionario ${!estadoActual ? 'activado' : 'desactivado'} correctamente.`,
                'Estado Actualizado'
            );
            cargarStaff();
        } catch (err: any) {
            toast.error(err.message, 'Error al Modificar Estado');
        }
    };

    const handleCambiarPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!modalPasswordId || !nuevaPassword) return;

        try {
            const res = await fetch('/api/urna/staff/password', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    idUsuario: modalPasswordId,
                    nuevaPassword: nuevaPassword.trim()
                }),
            });

            let data: any = {};
            try { data = await res.json(); } catch { throw new Error('Error al conectar con el servidor'); }
            if (!res.ok || !data.success) throw new Error(data.error || 'Error al cambiar contraseña');

            toast.success('Contraseña actualizada con éxito y cifrado robusto.', 'Clave Actualizada');
            setModalPasswordId(null);
            setNuevaPassword('');
            cargarStaff();
        } catch (err: any) {
            toast.error(err.message, 'Error al Actualizar Contraseña');
        }
    };

    return (
        <div className="w-full max-w-5xl mx-auto glass-panel p-4 sm:p-6 lg:p-8 rounded-2xl shadow-2xl space-y-6">
            {/* Encabezado Responsivo */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-5 gap-4">
                <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">Gestión de Personal Electoral</h2>
                        <p className="text-xs text-slate-400">Control institucional de Administradores y Auditores</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => setMostrarModalCrear(true)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition cursor-pointer shadow-md shadow-indigo-950/50"
                    >
                        <UserPlus className="w-4 h-4" />
                        <span>Nuevo Funcionario</span>
                    </button>
                    <button
                        onClick={cargarStaff}
                        className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl transition cursor-pointer"
                        title="Recargar lista"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={onVolver}
                        className="flex items-center gap-1 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium rounded-xl transition cursor-pointer"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Volver</span>
                    </button>
                </div>
            </div>

            {exitoMsg && (
                <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/80 rounded-xl text-emerald-300 text-xs flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>{exitoMsg}</span>
                </div>
            )}

            {errorMsg && (
                <div className="p-3.5 bg-rose-950/40 border border-rose-800/80 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{errorMsg}</span>
                </div>
            )}

            {/* Vista Móvil: Tarjetas */}
            <div className="grid grid-cols-1 gap-3 md:hidden">
                {loading ? (
                    <div className="text-center py-8 text-slate-500 text-xs">Cargando personal electoral...</div>
                ) : personal.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 text-xs">No hay personal registrado en el sistema.</div>
                ) : personal.map((usr) => (
                    <div key={usr.id} className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-3">
                        <div className="flex items-start justify-between">
                            <div>
                                <span className="font-bold text-sm text-white block">{usr.nombres} {usr.apellidos}</span>
                                <span className="text-xs text-slate-400 font-mono block mt-0.5">Doc: {usr.documento_identidad}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                usr.rol === 'ADMIN' ? 'bg-indigo-950 text-indigo-300 border border-indigo-800/60' : 'bg-cyan-950 text-cyan-300 border border-cyan-800/60'
                            }`}>
                                {usr.rol}
                            </span>
                        </div>
                        <div className="text-xs text-slate-400 flex items-center justify-between pt-1 border-t border-slate-900">
                            <span>Cargo: {usr.cargo}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                usr.esta_activo ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50' : 'bg-slate-900 text-slate-500 border border-slate-800'
                            }`}>
                                {usr.esta_activo ? 'Activo' : 'Inactivo'}
                            </span>
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/60">
                            <button
                                onClick={() => setModalPasswordId(usr.id)}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-[11px] rounded-lg transition"
                            >
                                <KeyRound className="w-3.5 h-3.5" />
                                <span>Clave</span>
                            </button>
                            <button
                                onClick={() => alternarEstado(usr.id, usr.esta_activo)}
                                className={`flex items-center gap-1 px-2.5 py-1.5 text-[11px] rounded-lg transition ${
                                    usr.esta_activo ? 'bg-rose-950/60 text-rose-300 border border-rose-900/60' : 'bg-emerald-950/60 text-emerald-300 border border-emerald-900/60'
                                }`}
                            >
                                {usr.esta_activo ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                <span>{usr.esta_activo ? 'Desactivar' : 'Activar'}</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Vista Desktop: Tabla */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-950/60">
                <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                        <tr>
                            <th className="py-3 px-4">Funcionario</th>
                            <th className="py-3 px-4">Documento</th>
                            <th className="py-3 px-4">Cargo</th>
                            <th className="py-3 px-4">Rol</th>
                            <th className="py-3 px-4 text-center">Estado</th>
                            <th className="py-3 px-4 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="text-center py-8 text-slate-500">Cargando funcionarios...</td>
                            </tr>
                        ) : personal.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center py-8 text-slate-500">No hay personal registrado en el sistema.</td>
                            </tr>
                        ) : personal.map((usr) => (
                            <tr key={usr.id} className="hover:bg-slate-900/50 transition">
                                <td className="py-3 px-4 font-semibold text-white">
                                    {usr.nombres} {usr.apellidos}
                                </td>
                                <td className="py-3 px-4 font-mono text-slate-300">{usr.documento_identidad}</td>
                                <td className="py-3 px-4 text-slate-400">{usr.cargo}</td>
                                <td className="py-3 px-4">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${usr.rol === 'ADMIN'
                                        ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-800/60'
                                        : 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/60'
                                        }`}>
                                        {usr.rol}
                                    </span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${usr.esta_activo ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/40' : 'bg-slate-900 text-slate-500 border border-slate-800'
                                        }`}>
                                        {usr.esta_activo ? 'Activo' : 'Inactivo'}
                                    </span>
                                </td>
                                <td className="py-3 px-4 text-right space-x-2">
                                    <button
                                        onClick={() => setModalPasswordId(usr.id)}
                                        className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg transition cursor-pointer"
                                        title="Cambiar Contraseña"
                                    >
                                        <KeyRound className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => alternarEstado(usr.id, usr.esta_activo)}
                                        className={`p-1.5 rounded-lg transition cursor-pointer ${usr.esta_activo
                                            ? 'bg-rose-950/60 text-rose-300 hover:bg-rose-900/60 border border-rose-900/40'
                                            : 'bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/60 border border-emerald-900/40'
                                            }`}
                                        title={usr.esta_activo ? 'Desactivar Usuario' : 'Activar Usuario'}
                                    >
                                        {usr.esta_activo ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal Crear Funcionario */}
            {mostrarModalCrear && (
                <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="max-w-md w-full glass-panel border border-slate-700/80 rounded-2xl p-6 space-y-4 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="text-base font-bold text-white">Registrar Nuevo Funcionario</h3>
                            <button
                                onClick={() => setMostrarModalCrear(false)}
                                className="text-slate-400 hover:text-white transition"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCrearUsuario} className="space-y-3.5 text-xs">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <div>
                                    <label className="block text-slate-300 font-semibold mb-1">Nombres</label>
                                    <input
                                        type="text"
                                        value={form.nombres}
                                        onChange={(e) => setForm({ ...form, nombres: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg text-white outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-300 font-semibold mb-1">Apellidos</label>
                                    <input
                                        type="text"
                                        value={form.apellidos}
                                        onChange={(e) => setForm({ ...form, apellidos: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg text-white outline-none"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <div>
                                    <label className="block text-slate-300 font-semibold mb-1">Documento / Cédula</label>
                                    <input
                                        type="text"
                                        value={form.documento}
                                        onChange={(e) => setForm({ ...form, documento: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg text-white font-mono outline-none"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-300 font-semibold mb-1">Rol</label>
                                    <select
                                        value={form.rol}
                                        onChange={(e) => setForm({ ...form, rol: e.target.value as any })}
                                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg text-white outline-none"
                                    >
                                        <option value="AUDITOR">AUDITOR</option>
                                        <option value="ADMIN">ADMIN</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-slate-300 font-semibold mb-1">Cargo Institucional</label>
                                <input
                                    type="text"
                                    value={form.cargo}
                                    onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                                    placeholder="Ej: Fiscal Delegado / Veedor Técnico"
                                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg text-white outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-slate-300 font-semibold mb-1">Contraseña Inicial</label>
                                <input
                                    type="password"
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg text-white font-mono outline-none"
                                    placeholder="Mínimo 6 caracteres"
                                    required
                                />
                            </div>

                            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setMostrarModalCrear(false)}
                                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer transition text-xs font-semibold"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl cursor-pointer transition text-xs shadow-md shadow-indigo-950/50"
                                >
                                    Guardar Funcionario
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Restablecer Contraseña */}
            {modalPasswordId && (
                <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="max-w-sm w-full glass-panel border border-slate-700/80 rounded-2xl p-6 space-y-4 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <h3 className="text-sm font-bold text-white">Cambiar Contraseña de Funcionario</h3>
                            <button
                                onClick={() => { setModalPasswordId(null); setNuevaPassword(''); }}
                                className="text-slate-400 hover:text-white transition"
                            >
                                ✕
                            </button>
                        </div>
                        <form onSubmit={handleCambiarPassword} className="space-y-3.5 text-xs">
                            <div>
                                <label className="block text-slate-300 font-semibold mb-1">Nueva Contraseña</label>
                                <input
                                    type="password"
                                    value={nuevaPassword}
                                    onChange={(e) => setNuevaPassword(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg text-white font-mono outline-none"
                                    placeholder="••••••••••••"
                                    required
                                />
                            </div>
                            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => { setModalPasswordId(null); setNuevaPassword(''); }}
                                    className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer transition text-xs font-semibold"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold cursor-pointer transition text-xs shadow-md shadow-indigo-950/50"
                                >
                                    Actualizar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};