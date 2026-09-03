import React, { useEffect, useState } from 'react';
import { Download, Printer, ShieldCheck, ArrowLeft, RefreshCw } from 'lucide-react';

interface CandidatoResultado {
    id_candidato: string;
    numero_lista: number;
    nombre_completo: string;
    total_votos: number;
    porcentaje: number;
}

interface ActaData {
    tipoDocumento: string;
    versionProtocolo: string;
    generadaAt: string;
    eleccion: {
        id: string;
        titulo: string;
        estado: string;
        iniciadaAt: string;
    };
    auditoriaCriptografica: {
        totalVotosValidos: number;
        totalTokensConsumidos: number;
        balanceConsistencia: string;
        hashGenesisPrev: string;
        selloRaizFinalHash: string;
        totalBloquesEncadenados: number;
    };
    resultados: CandidatoResultado[];
}

interface ActaEscrutinioProps {
    eleccionId: string;
    onVolver: () => void;
}

export const ActaEscrutinio: React.FC<ActaEscrutinioProps> = ({ eleccionId, onVolver }) => {
    const [acta, setActa] = useState<ActaData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    const cargarActa = async () => {
        setLoading(true);
        try {
            const token = sessionStorage.getItem('staff_token');

            const res = await fetch(`/api/urna/acta?eleccionId=${eleccionId}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
            });

            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setActa(data.acta);
                } else {
                    console.error('Error al obtener acta:', data.error);
                }
            }
        } catch (err) {
            console.error('Error de red al cargar acta:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarActa();
    }, [eleccionId]);

    const descargarJSON = () => {
        if (!acta) return;
        const blob = new Blob([JSON.stringify(acta, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `acta_escrutinio_${eleccionId.substring(0, 8)}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const imprimirActa = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className="w-full max-w-4xl mx-auto p-12 text-center text-slate-400 text-sm glass-panel rounded-2xl">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-cyan-400" />
                <span>Generando acta oficial con sellado digital de custodia...</span>
            </div>
        );
    }

    if (!acta) {
        return (
            <div className="w-full max-w-4xl mx-auto p-8 glass-panel rounded-2xl text-center text-slate-400 text-sm">
                No se pudo consolidar el acta oficial de la elección.
            </div>
        );
    }

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6">
            {/* Botonera de Acciones (Oculta al imprimir) */}
            <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between glass-panel p-4 rounded-2xl gap-3">
                <button
                    onClick={onVolver}
                    className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-medium rounded-xl transition cursor-pointer"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Volver</span>
                </button>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={descargarJSON}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-cyan-950/80 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-800/80 text-xs font-semibold rounded-xl transition cursor-pointer"
                    >
                        <Download className="w-3.5 h-3.5" />
                        <span>Descargar JSON Auditado</span>
                    </button>
                    <button
                        onClick={imprimirActa}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl transition cursor-pointer shadow-md shadow-emerald-950/50"
                    >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Imprimir / Exportar PDF</span>
                    </button>
                </div>
            </div>

            {/* Documento Oficial del Acta */}
            <div className="glass-panel p-5 sm:p-8 lg:p-10 rounded-2xl shadow-2xl space-y-8 print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
                {/* Encabezado del Acta */}
                <div className="border-b border-slate-800/80 print:border-black pb-6 space-y-2 text-center">
                    <div className="inline-flex items-center space-x-2 px-3 py-1 bg-emerald-950/60 border border-emerald-800/80 text-emerald-400 print:border-black print:text-black rounded-full text-[11px] font-mono mb-2">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>DOCUMENTO OFICIAL DE AUDITORÍA Y ESCRUTINIO ELECTORAL</span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold text-white print:text-black tracking-tight">
                        Acta de Cierre y Escrutinio Final
                    </h1>
                    <p className="text-xs text-slate-400 print:text-slate-700">
                        {acta.eleccion.titulo} — Identificador: <span className="font-mono">{acta.eleccion.id}</span>
                    </p>
                </div>

                {/* Metadatos Generales */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl print:border-slate-300 print:bg-slate-50">
                        <span className="text-slate-400 print:text-slate-600 block mb-1">Estado de Jornada</span>
                        <span className="font-bold text-emerald-400 print:text-emerald-700">{acta.eleccion.estado}</span>
                    </div>
                    <div className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl print:border-slate-300 print:bg-slate-50">
                        <span className="text-slate-400 print:text-slate-600 block mb-1">Total Votos Emitidos</span>
                        <span className="font-bold font-mono text-white print:text-black text-sm">
                            {acta.auditoriaCriptografica.totalVotosValidos}
                        </span>
                    </div>
                    <div className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl print:border-slate-300 print:bg-slate-50">
                        <span className="text-slate-400 print:text-slate-600 block mb-1">Tokens Quemados</span>
                        <span className="font-bold font-mono text-cyan-400 print:text-cyan-800 text-sm">
                            {acta.auditoriaCriptografica.totalTokensConsumidos}
                        </span>
                    </div>
                    <div className="p-3.5 bg-slate-950/70 border border-slate-800/80 rounded-xl print:border-slate-300 print:bg-slate-50">
                        <span className="text-slate-400 print:text-slate-600 block mb-1">Consistencia Urna</span>
                        <span className="font-bold text-emerald-400 print:text-black">
                            {acta.auditoriaCriptografica.balanceConsistencia}
                        </span>
                    </div>
                </div>

                {/* Tabla de Resultados Oficiales */}
                <div className="space-y-3">
                    <h2 className="text-xs font-bold text-slate-300 print:text-black uppercase tracking-wider">
                        Cuadro Final de Votación
                    </h2>
                    <div className="overflow-x-auto border border-slate-800/80 print:border-slate-300 rounded-xl bg-slate-950/60">
                        <table className="w-full text-left text-xs min-w-[340px]">
                            <thead className="bg-slate-900/90 print:bg-slate-100 text-slate-400 print:text-slate-800 font-semibold border-b border-slate-800 print:border-slate-300">
                                <tr>
                                    <th className="p-3">Lista</th>
                                    <th className="p-3">Opción / Candidatura</th>
                                    <th className="p-3 text-right">Votos</th>
                                    <th className="p-3 text-right">Porcentaje</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60 print:divide-slate-200">
                                {acta.resultados.map((r) => (
                                    <tr key={r.id_candidato} className="hover:bg-slate-900/40">
                                        <td className="p-3 font-mono font-bold text-indigo-300 print:text-black">#{r.numero_lista}</td>
                                        <td className="p-3 text-slate-200 print:text-black font-medium">{r.nombre_completo}</td>
                                        <td className="p-3 text-right font-mono font-bold text-white print:text-black">{r.total_votos}</td>
                                        <td className="p-3 text-right font-mono text-emerald-400 print:text-black font-semibold">
                                            {r.porcentaje}%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Cadena de Custodia Inmutable */}
                <div className="space-y-3">
                    <h2 className="text-xs font-bold text-slate-300 print:text-black uppercase tracking-wider">
                        Registro Inmutable y Sello Digital de Clausura
                    </h2>
                    <div className="p-4 bg-slate-950/80 print:bg-slate-50 border border-slate-800/80 print:border-slate-300 rounded-xl space-y-3 text-[11px] font-mono">
                        <div>
                            <span className="text-slate-400 print:text-slate-600 block text-[10px]">CÓDIGO GÉNESIS INICIAL</span>
                            <p className="text-slate-300 print:text-black break-all">{acta.auditoriaCriptografica.hashGenesisPrev}</p>
                        </div>
                        <div>
                            <span className="text-slate-400 print:text-slate-600 block text-[10px]">SELLO DIGITAL DE CLAUSURA (ESLABÓN FINAL)</span>
                            <p className="text-cyan-400 print:text-cyan-900 font-bold break-all">
                                {acta.auditoriaCriptografica.selloRaizFinalHash}
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-slate-400 print:text-slate-600 text-[10px] pt-2 border-t border-slate-900 print:border-slate-200">
                            <span>Eslabones registrados: #{acta.auditoriaCriptografica.totalBloquesEncadenados}</span>
                            <span>Sellado en: {new Date(acta.generadaAt).toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* Firmas de Responsabilidad */}
                <div className="pt-8 border-t border-slate-800/80 print:border-slate-300 grid grid-cols-1 sm:grid-cols-2 gap-8 text-center text-xs">
                    <div className="space-y-8">
                        <div className="border-b border-slate-700 print:border-black mx-4 sm:mx-8 pb-1"></div>
                        <p className="text-slate-400 print:text-slate-700 font-medium">Presidente de Mesa / Autoridad Electoral</p>
                    </div>
                    <div className="space-y-8">
                        <div className="border-b border-slate-700 print:border-black mx-4 sm:mx-8 pb-1"></div>
                        <p className="text-slate-400 print:text-slate-700 font-medium">Auditor Técnico de Sistema Electoral</p>
                    </div>
                </div>
            </div>
        </div>
    );
};