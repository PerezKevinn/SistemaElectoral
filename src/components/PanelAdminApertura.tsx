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
        <div className="max-w-2xl mx-auto p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-5">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
                        <Play className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Configuración y Apertura Electoral</h2>
                        <p className="text-xs text-slate-400">Creación de candidaturas y habilitación de la urna para votación</p>
                    </div>
                </div>

                <button
                    onClick={onVolver}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg transition"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Volver</span>
                </button>
            </div>

            {exito ? (
                <div className="p-6 bg-emerald-950/30 border border-emerald-800/80 rounded-xl text-center space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                    <h3 className="text-sm font-bold text-emerald-200">{exito}</h3>
                    <p className="text-xs text-slate-400">Redirigiendo a la cabina electoral...</p>
                </div>
            ) : (
                <form onSubmit={handleCrearYAbrir} className="space-y-5 text-xs">
                    <div>
                        <label className="block font-semibold text-slate-300 mb-1">Título de la Elección</label>
                        <input
                            type="text"
                            value={titulo}
                            onChange={(e) => setTitulo(e.target.value)}
                            placeholder="Ej: Elección Junta Directiva 2026-2028"
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg text-slate-200 outline-none"
                            required
                        />
                    </div>

                    <div>
                        <label className="block font-semibold text-slate-300 mb-1">Descripción / Objeto</label>
                        <textarea
                            value={descripcion}
                            onChange={(e) => setDescripcion(e.target.value)}
                            placeholder="Detalle o propósito de la jornada..."
                            rows={2}
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg text-slate-200 outline-none"
                        />
                    </div>

                    {/* Listas / Candidaturas */}
                    <div className="space-y-3 pt-2">
                        <div className="flex justify-between items-center">
                            <label className="font-semibold text-slate-300">Papeleta de Candidatos / Opciones</label>
                            <button
                                type="button"
                                onClick={agregarCandidato}
                                className="flex items-center space-x-1 text-indigo-400 hover:text-indigo-300"
                            >
                                <PlusCircle className="w-4 h-4" />
                                <span>Agregar Plancha</span>
                            </button>
                        </div>

                        {candidatos.map((cand, idx) => (
                            <div key={idx} className="flex items-center space-x-2">
                                <input
                                    type="number"
                                    value={cand.numeroLista}
                                    onChange={(e) => actualizarCandidato(idx, 'numeroLista', parseInt(e.target.value) || 0)}
                                    className="w-16 px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-center font-mono text-slate-200"
                                />
                                <input
                                    type="text"
                                    value={cand.nombre}
                                    onChange={(e) => actualizarCandidato(idx, 'nombre', e.target.value)}
                                    placeholder="Nombre de la plancha o candidato"
                                    className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200"
                                    required
                                />
                                {candidatos.length > 2 && cand.numeroLista !== 99 && (
                                    <button
                                        type="button"
                                        onClick={() => eliminarCandidato(idx)}
                                        className="p-2 text-slate-500 hover:text-rose-400"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Clave Admin */}
                    <div className="pt-2 border-t border-slate-800">
                        <label className="block font-semibold text-slate-300 mb-1">Clave de Custodia Administrativa</label>
                        <input
                            type="password"
                            value={adminClave}
                            onChange={(e) => setAdminClave(e.target.value)}
                            placeholder="ADMIN_SECRET_2026"
                            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-lg text-slate-200 font-mono outline-none"
                            required
                        />
                    </div>

                    {errorMsg && (
                        <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-lg flex items-center space-x-2 text-red-300">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-semibold rounded-xl transition"
                    >
                        {loading ? 'Aperturando Jornada Electoral...' : 'Crear y Abrir Elección Oficial'}
                    </button>
                </form>
            )}
        </div>
    );
};