import React, { useState, useEffect } from 'react';
import { Users, UserPlus, KeyRound, CheckCircle2, XCircle, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';

const API_BASE_URL = 'https://sistema-elecciones-api.onrender.com';

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
            const res = await fetch(`${API_BASE_URL}/api/urna/staff`, {
                headers: getAuthHeaders()
            });
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
            const res = await fetch(`${API_BASE_URL}/api/urna/staff/crear`, {
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

            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'Error al crear funcionario');

            setExitoMsg('Funcionario registrado exitosamente.');
            setForm({ documento: '', nombres: '', apellidos: '', cargo: '', rol: 'AUDITOR', password: '' });
            setMostrarModalCrear(false);
            cargarStaff();
        } catch (err: any) {
            setErrorMsg(err.message);
        }
    };

    const alternarEstado = async (id: string, estadoActual: boolean) => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/urna/staff/${id}/estado`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify({ esta_activo: !estadoActual }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'Error al modificar estado');
            cargarStaff();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleCambiarPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!modalPasswordId || !nuevaPassword) return;

        try {
            const res = await fetch(`${API_BASE_URL}/api/urna/staff/${modalPasswordId}/password`, {
                method: 'PATCH',
                headers: getAuthHeaders(),
                body: JSON.stringify({ password: nuevaPassword.trim() }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || 'Error al cambiar contraseña');

            alert('Contraseña actualizada con éxito');
            setModalPasswordId(null);
            setNuevaPassword('');
        } catch (err: any) {
            alert(err.message);
        }
    };

    return (
        <div className="max-w-5xl mx-auto p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl space-y-6">
            {/* Encabezado */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-5">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
                        <Users className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Gestión de Credenciales y Personal</h2>
                        <p className="text-xs text-slate-400">Control institucional de Administradores y Auditores</p>
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setMostrarModalCrear(true)}
                        className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
                    >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Nuevo Funcionario</span>
                    </button>
                    <button
                        onClick={cargarStaff}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition cursor-pointer"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={onVolver}
                        className="flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition cursor-pointer"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Volver</span>
                    </button>
                </div>
            </div>

            {exitoMsg && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-800 rounded-lg text-emerald-300 text-xs flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{exitoMsg}</span>
                </div>
            )}

            {errorMsg && (
                <div className="p-3 bg-rose-950/40 border border-rose-800 rounded-lg text-rose-300 text-xs flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4" />
                    <span>{errorMsg}</span>
                </div>
            )}

            {/* Tabla de Usuarios */}
            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
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
                                <td colSpan={6} className="text-center py-6 text-slate-500">Cargando funcionarios...</td>
                            </tr>
                        ) : personal.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center py-6 text-slate-500">No hay personal registrado en el sistema.</td>
                            </tr>
                        ) : personal.map((usr) => (
                            <tr key={usr.id} className="hover:bg-slate-800/30 transition">
                                <td className="py-3 px-4 font-medium text-white">
                                    {usr.nombres} {usr.apellidos}
                                </td>
                                <td className="py-3 px-4 font-mono">{usr.documento_identidad}</td>
                                <td className="py-3 px-4 text-slate-400">{usr.cargo}</td>
                                <td className="py-3 px-4">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${usr.rol === 'ADMIN'
                                        ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                                        : 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/60'
                                        }`}>
                                        {usr.rol}
                                    </span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] ${usr.esta_activo ? 'bg-emerald-950 text-emerald-300' : 'bg-slate-800 text-slate-500'
                                        }`}>
                                        {usr.esta_activo ? 'Activo' : 'Inactivo'}
                                    </span>
                                </td>
                                <td className="py-3 px-4 text-right space-x-2">
                                    <button
                                        onClick={() => setModalPasswordId(usr.id)}
                                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition cursor-pointer"
                                        title="Cambiar Contraseña"
                                    >
                                        <KeyRound className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => alternarEstado(usr.id, usr.esta_activo)}
                                        className={`p-1.5 rounded transition cursor-pointer ${usr.esta_activo
                                            ? 'bg-rose-950/60 text-rose-300 hover:bg-rose-900/60'
                                            : 'bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/60'
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
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
                        <h3 className="text-base font-bold text-white">Registrar Nuevo Funcionario</h3>

                        <form onSubmit={handleCrearUsuario} className="space-y-3 text-xs">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-slate-400 mb-1">Nombres</label>
                                    <input
                                        type="text"
                                        value={form.nombres}
                                        onChange={(e) => setForm({ ...form, nombres: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-400 mb-1">Apellidos</label>
                                    <input
                                        type="text"
                                        value={form.apellidos}
                                        onChange={(e) => setForm({ ...form, apellidos: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-slate-400 mb-1">Documento / Cédula</label>
                                    <input
                                        type="text"
                                        value={form.documento}
                                        onChange={(e) => setForm({ ...form, documento: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-400 mb-1">Rol</label>
                                    <select
                                        value={form.rol}
                                        onChange={(e) => setForm({ ...form, rol: e.target.value as any })}
                                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                                    >
                                        <option value="AUDITOR">AUDITOR</option>
                                        <option value="ADMIN">ADMIN</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-slate-400 mb-1">Cargo Institucional</label>
                                <input
                                    type="text"
                                    value={form.cargo}
                                    onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                                    placeholder="Ej: Fiscal Delegado / Veedor Técnico"
                                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-slate-400 mb-1">Contraseña Inicial</label>
                                <input
                                    type="password"
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                                    placeholder="Mínimo 6 caracteres"
                                    required
                                />
                            </div>

                            <div className="flex justify-end space-x-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setMostrarModalCrear(false)}
                                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg cursor-pointer"
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
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="max-w-sm w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
                        <h3 className="text-sm font-bold text-white">Cambiar Contraseña de Funcionario</h3>
                        <form onSubmit={handleCambiarPassword} className="space-y-3 text-xs">
                            <div>
                                <label className="block text-slate-400 mb-1">Nueva Contraseña</label>
                                <input
                                    type="password"
                                    value={nuevaPassword}
                                    onChange={(e) => setNuevaPassword(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono"
                                    placeholder="••••••••••••"
                                    required
                                />
                            </div>
                            <div className="flex justify-end space-x-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => { setModalPasswordId(null); setNuevaPassword(''); }}
                                    className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-semibold cursor-pointer"
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