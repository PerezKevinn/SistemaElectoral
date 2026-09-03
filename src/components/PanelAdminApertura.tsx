import React, { useState } from 'react';
import { PlusCircle, Play, CheckCircle2, AlertCircle, ArrowLeft, Trash2 } from 'lucide-react';

interface CandidatoForm {
    numeroLista: number;
    nombre: string;
}

interface PanelAdminAperturaProps {
    onEleccionIniciada: (idEleccion: string) => void;
    onVolver: () => void;
}

export const PanelAdminApertura: React.FC<PanelAdminAperturaProps> = ({ onEleccionIniciada, onVolver }) => {
    const [titulo, setTitulo] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [adminClave, setAdminClave] = useState('');
    const [candidatos, setCandidatos] = useState<CandidatoForm[]>([
        { numeroLista: 1, nombre: '' },
        { numeroLista: 99, nombre: 'Voto en Blanco' },
    ]);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [exito, setExito] = useState<string | null>(null);

    const agregarCandidato = () => {
        const proximoNumero = candidatos.length > 0 ? Math.max(...candidatos.map((c) => c.numeroLista).filter(n => n !== 99), 0) + 1 : 1;
        setCandidatos([...candidatos.slice(0, -1), { numeroLista: proximoNumero, nombre: '' }, candidatos[candidatos.length - 1]]);
    };

    const eliminarCandidato = (index: number) => {
        if (candidatos.length <= 2) return;
        setCandidatos(candidatos.filter((_, i) => i !== index));
    };

    const actualizarCandidato = (index: number, campo: keyof CandidatoForm, valor: any) => {
        const copia = [...candidatos];
        copia[index] = { ...copia[index], [campo]: valor };
        setCandidatos(copia);
    };

    const handleCrearYAbrir = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!titulo || !adminClave || candidatos.some((c) => !c.nombre.trim())) {
            setErrorMsg('Por favor completa todos los campos de candidatos y claves.');
            return;
        }

        setLoading(true);
        setErrorMsg(null);

        try {
            const token = sessionStorage.getItem('staff_token');

            if (!token) {
                throw new Error('No hay una sesión administrativa activa. Por favor vuelve a iniciar sesión.');
            }

            const authHeaders = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            };

            // 1. Crear Elección y Candidatos (Ruta protegida para ADMIN)
            const resCrear = await fetch('/api/urna/crear', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ titulo, descripcion, candidatos, adminClave }),
            });

            const dataCrear = await resCrear.json();
            if (!resCrear.ok || !dataCrear.success) {
                throw new Error(dataCrear.error || 'Error al crear la elección');
            }

            const idEleccionGenerada = dataCrear.idEleccion;

            // 2. Abrir la Elección Oficialmente (Ruta protegida para ADMIN)
            const resAbrir = await fetch('/api/urna/abrir', {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ eleccionId: idEleccionGenerada, adminClave }),
            });

            const dataAbrir = await resAbrir.json();
            if (!resAbrir.ok || !dataAbrir.success) {
                throw new Error(dataAbrir.error || 'Error al abrir la jornada electoral');
            }

            setExito(`Elección "${titulo}" abierta con éxito.`);
            setTimeout(() => onEleccionIniciada(idEleccionGenerada), 1500);
        } catch (err: any) {
            setErrorMsg(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-3xl mx-auto glass-panel p-4 sm:p-6 lg:p-8 rounded-2xl shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-5 gap-3">
                <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400">
                        <Play className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">Configuración y Apertura Electoral</h2>
                        <p className="text-xs text-slate-400">Creación de candidaturas y habilitación de la urna digital</p>
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

            {exito ? (
                <div className="p-6 bg-emerald-950/30 border border-emerald-800/80 rounded-2xl text-center space-y-2 animate-in fade-in duration-200">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                    <h3 className="text-sm font-bold text-emerald-200">{exito}</h3>
                    <p className="text-xs text-slate-400">Redirigiendo al panel de escrutinio...</p>
                </div>
            ) : (
                <form onSubmit={handleCrearYAbrir} className="space-y-5 text-xs">
                    <div>
                        <label className="block font-semibold text-slate-300 mb-1.5">Título de la Elección</label>
                        <input
                            type="text"
                            value={titulo}
                            onChange={(e) => setTitulo(e.target.value)}
                            placeholder="Ej: Elección Junta Directiva 2026-2028"
                            className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-slate-200 outline-none text-xs sm:text-sm"
                            required
                        />
                    </div>

                    <div>
                        <label className="block font-semibold text-slate-300 mb-1.5">Descripción / Objeto Institucional</label>
                        <textarea
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                            placeholder="Detalle o propósito estatutario de la jornada..."
                            rows={2}
                            className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-slate-200 outline-none text-xs sm:text-sm"
                        />
                    </div>

                    {/* Listas / Candidaturas */}
                    <div className="space-y-3 pt-2">
                        <div className="flex justify-between items-center">
                            <div>
                                <label className="font-semibold text-slate-300 block">Papeleta de Candidatos / Planchas</label>
                                <span className="text-[10px] text-slate-500">Configure las opciones que verán los electores</span>
                            </div>
                            <button
                                type="button"
                                onClick={agregarCandidato}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-950 text-indigo-300 border border-indigo-800/60 hover:bg-indigo-900/60 rounded-lg transition text-xs font-semibold cursor-pointer"
                            >
                                <PlusCircle className="w-3.5 h-3.5" />
                                <span>Agregar Opción</span>
                            </button>
                        </div>

                        <div className="space-y-2">
                            {candidatos.map((cand, idx) => (
                                <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/60 border border-slate-800/70">
                                    <div className="w-16 sm:w-20 flex-shrink-0">
                                        <input
                                            type="number"
                                            value={cand.numeroLista}
                                            onChange={(e) => actualizarCandidato(idx, 'numeroLista', parseInt(e.target.value) || 0)}
                                            className="w-full px-2 py-2 bg-slate-900 border border-slate-800 rounded-lg text-center font-mono font-bold text-indigo-300 text-xs sm:text-sm outline-none focus:border-indigo-500"
                                            title="Número de Lista"
                                        />
                                    </div>
                                    <input
                                        type="text"
                                        value={cand.nombre}
                                        onChange={(e) => actualizarCandidato(idx, 'nombre', e.target.value)}
                                        placeholder="Nombre de la plancha o candidato"
                                        className="flex-1 px-3 py-2 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-lg text-slate-200 text-xs sm:text-sm outline-none"
                                        required
                                    />
                                    {candidatos.length > 2 && cand.numeroLista !== 99 && (
                                        <button
                                            type="button"
                                            onClick={() => eliminarCandidato(idx)}
                                            className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition"
                                            title="Eliminar candidato"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Clave Admin */}
                    <div className="pt-3 border-t border-slate-800/80">
                        <label className="block font-semibold text-slate-300 mb-1.5">Clave de Custodia Administrativa</label>
                        <input
                            type="password"
                            value={adminClave}
                            onChange={(e) => setAdminClave(e.target.value)}
                            placeholder="ADMIN_SECRET_2026"
                            className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-slate-200 font-mono outline-none text-xs sm:text-sm"
                            required
                        />
                    </div>

                    {errorMsg && (
                        <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl flex items-center space-x-2 text-rose-300">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:bg-slate-800 text-white font-bold rounded-xl transition shadow-lg shadow-indigo-950/60 cursor-pointer disabled:cursor-not-allowed text-xs sm:text-sm"
                    >
                        {loading ? 'Aperturando Jornada Electoral...' : 'Crear y Abrir Elección Oficial'}
                    </button>
                </form>
            )}
        </div>
    );
};