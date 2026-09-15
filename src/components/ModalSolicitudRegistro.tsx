import React, { useState } from 'react';
import {
    UserPlus,
    Search,
    CheckCircle2,
    AlertCircle,
    Copy,
    Check,
    Clock,
    XCircle,
    Shield,
    X,
    User,
    Mail,
    Phone,
    Building2,
    FileText,
} from 'lucide-react';
import { useToast } from './Toast';

interface ModalSolicitudRegistroProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ModalSolicitudRegistro: React.FC<ModalSolicitudRegistroProps> = ({ isOpen, onClose }) => {
    const toast = useToast();
    const [pestaña, setPestaña] = useState<'NUEVA' | 'CONSULTAR'>('NUEVA');

    // Estados Formulario Solicitud (Los mismos 5 campos estipulados)
    const [form, setForm] = useState({
        documento: '',
        nombreCompleto: '',
        correo: '',
        subdirectiva: '',
        telefono: '',
    });

    const [enviando, setEnviando] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [solicitudExitosa, setSolicitudExitosa] = useState<{
        radicado: string;
        documento: string;
        nombreCompleto: string;
        correo: string;
    } | null>(null);
    const [copiado, setCopiado] = useState(false);

    // Estados Consulta de Estado
    const [docConsulta, setDocConsulta] = useState('');
    const [consultando, setConsultando] = useState(false);
    const [resultadoConsulta, setResultadoConsulta] = useState<{
        estaEnCenso: boolean;
        datosCenso?: { habilitado: boolean; yaVoto: boolean; nombre: string } | null;
        solicitud?: {
            id: string;
            codigo_radicado: string;
            documento_identidad: string;
            nombres: string;
            apellidos: string;
            correo: string;
            subdirectiva: string;
            telefono: string;
            estado: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';
            motivo_rechazo?: string | null;
            revisado_por?: string | null;
            revisado_rol?: string | null;
            revisado_at?: string | null;
            creado_at: string;
        } | null;
    } | null>(null);
    const [consultaRealizada, setConsultaRealizada] = useState(false);

    if (!isOpen) return null;

    const handleEnviarSolicitud = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setEnviando(true);

        try {
            const res = await fetch('/api/censo/solicitudes/crear', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    documento: form.documento.trim(),
                    nombreCompleto: form.nombreCompleto.trim(),
                    correo: form.correo.trim().toLowerCase(),
                    subdirectiva: form.subdirectiva.trim(),
                    telefono: form.telefono.trim(),
                }),
            });

            let data: any = {};
            try {
                data = await res.json();
            } catch {
                throw new Error('Error de comunicación con el servidor electoral.');
            }

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Error al radicar la solicitud de registro.');
            }

            setSolicitudExitosa({
                radicado: data.radicado,
                documento: form.documento.trim(),
                nombreCompleto: form.nombreCompleto.trim(),
                correo: form.correo.trim().toLowerCase(),
            });

            toast.success(`Solicitud radicada con éxito. Radicado: ${data.radicado}`, 'Radicación Exitosa');
        } catch (err: any) {
            setErrorMsg(err.message);
            toast.error(err.message, 'No se pudo radicar');
        } finally {
            setEnviando(false);
        }
    };

    const handleConsultarEstado = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        if (!docConsulta.trim()) return;

        setConsultando(true);
        setConsultaRealizada(true);
        try {
            const res = await fetch(`/api/censo/solicitudes/estado/${encodeURIComponent(docConsulta.trim())}`);
            let data: any = {};
            try {
                data = await res.json();
            } catch {
                throw new Error('Error al consultar el censo.');
            }

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Error al consultar estado de la solicitud.');
            }

            setResultadoConsulta(data);
        } catch (err: any) {
            setErrorMsg(err.message);
            setResultadoConsulta(null);
        } finally {
            setConsultando(false);
        }
    };

    const handleCopiarRadicado = (radicado: string) => {
        navigator.clipboard.writeText(radicado);
        setCopiado(true);
        toast.info('Número de radicado copiado al portapapeles');
        setTimeout(() => setCopiado(false), 2500);
    };

    const reiniciarFormulario = () => {
        setForm({
            documento: '',
            nombreCompleto: '',
            correo: '',
            subdirectiva: '',
            telefono: '',
        });
        setSolicitudExitosa(null);
        setErrorMsg(null);
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-200">
            <div className="max-w-lg w-full glass-panel border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
                {/* Institutional Header */}
                <div className="bg-slate-900/90 border-b border-slate-800 p-4 sm:p-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-md">
                            <UserPlus className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-emerald-400">
                                    Censo Electoral
                                </span>
                                <span className="w-1 h-1 rounded-full bg-slate-600" />
                                <span className="text-[10px] text-slate-400">Portal del Votante</span>
                            </div>
                            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                                Inscripción y Solicitud de Censo
                            </h2>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                        title="Cerrar ventana"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs Selector */}
                <div className="grid grid-cols-2 p-1.5 bg-slate-950/80 border-b border-slate-800 text-xs">
                    <button
                        type="button"
                        onClick={() => { setPestaña('NUEVA'); setErrorMsg(null); }}
                        className={`py-2 px-3 rounded-lg font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${pestaña === 'NUEVA'
                            ? 'bg-emerald-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                            }`}
                    >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Nueva Solicitud</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => { setPestaña('CONSULTAR'); setErrorMsg(null); }}
                        className={`py-2 px-3 rounded-lg font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${pestaña === 'CONSULTAR'
                            ? 'bg-cyan-600 text-white shadow-md'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                            }`}
                    >
                        <Search className="w-3.5 h-3.5" />
                        <span>Consultar Radicado</span>
                    </button>
                </div>

                {/* Content Area */}
                <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
                    {/* ---------------- PESTAÑA: NUEVA SOLICITUD ---------------- */}
                    {pestaña === 'NUEVA' && (
                        solicitudExitosa ? (
                            /* Pantalla de Éxito con Radicado */
                            <div className="space-y-4 text-center py-2 animate-in fade-in duration-200">
                                <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400 shadow-lg">
                                    <CheckCircle2 className="w-8 h-8" />
                                </div>

                                <div>
                                    <span className="inline-block px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/60 mb-2">
                                        RADICACIÓN FORMAL COMPLETADA
                                    </span>
                                    <h3 className="text-base sm:text-lg font-bold text-white">
                                        Solicitud de Inscripción Recibida
                                    </h3>
                                    <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
                                        Su solicitud ha sido radicada bajo protocolo de auditoría continua y pasará a revisión y aprobación de los <strong>Auditores y Administradores</strong>.
                                    </p>
                                </div>

                                {/* Tarjeta de Radicado */}
                                <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-left space-y-2.5">
                                    <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                                        <span className="text-[11px] text-slate-400 font-semibold uppercase">Código de Radicado Oficial</span>
                                        <button
                                            type="button"
                                            onClick={() => handleCopiarRadicado(solicitudExitosa.radicado)}
                                            className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 transition cursor-pointer"
                                        >
                                            {copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                            <span>{copiado ? 'Copiado' : 'Copiar'}</span>
                                        </button>
                                    </div>

                                    <div className="font-mono text-base font-bold text-emerald-300 tracking-wider">
                                        {solicitudExitosa.radicado}
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/60 text-[11px]">
                                        <div>
                                            <span className="text-slate-500 block">Elector:</span>
                                            <span className="text-slate-200 font-semibold">{solicitudExitosa.nombreCompleto}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 block">Documento:</span>
                                            <span className="text-slate-200 font-mono">{solicitudExitosa.documento}</span>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-slate-500 block">Correo para Notificación de Credenciales:</span>
                                            <span className="text-slate-200 font-mono">{solicitudExitosa.correo}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-900/40 text-left flex items-start gap-2.5 text-xs text-slate-300">
                                    <Shield className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                                    <div className="text-[11px] leading-relaxed text-slate-400">
                                        Una vez aprobada por la mesa auditora, el sistema generará automáticamente sus credenciales seguras y las despachará a su correo.
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={reiniciarFormulario}
                                        className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-xl text-xs font-semibold text-slate-200 transition cursor-pointer"
                                    >
                                        Registrar Otra Solicitud
                                    </button>
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-md"
                                    >
                                        Entendido y Cerrar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Formulario con los mismos 5 campos estipulados */
                            <form onSubmit={handleEnviarSolicitud} className="space-y-3.5 text-xs">
                                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed">
                                    Diligencie sus datos oficiales tal como figuran en su documento. El sistema validará que no exista una solicitud o registro previo.
                                </div>

                                {/* Campo 1: Documento */}
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                                            <User className="w-3.5 h-3.5 text-emerald-400" />
                                            <span>No. Identificación / Cédula</span>
                                        </label>
                                        <span className="text-[10px] font-mono text-emerald-400">Obligatorio</span>
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        value={form.documento}
                                        onChange={(e) => setForm({ ...form, documento: e.target.value })}
                                        placeholder="Ej: 1098765432"
                                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg text-white font-mono outline-none transition"
                                    />
                                </div>

                                {/* Campo 2: Nombre Completo */}
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                                            <FileText className="w-3.5 h-3.5 text-emerald-400" />
                                            <span>Nombre Completo</span>
                                        </label>
                                        <span className="text-[10px] font-mono text-emerald-400">Obligatorio</span>
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        value={form.nombreCompleto}
                                        onChange={(e) => setForm({ ...form, nombreCompleto: e.target.value })}
                                        placeholder="Ej: María Camila Restrepo Peña"
                                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg text-white outline-none transition"
                                    />
                                </div>

                                {/* Campo 3: Correo Electrónico */}
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                                            <Mail className="w-3.5 h-3.5 text-emerald-400" />
                                            <span>Correo Electrónico</span>
                                        </label>
                                        <span className="text-[10px] font-mono text-emerald-400">Obligatorio</span>
                                    </div>
                                    <input
                                        type="email"
                                        required
                                        value={form.correo}
                                        onChange={(e) => setForm({ ...form, correo: e.target.value })}
                                        placeholder="maria.restrepo@sindicato.org"
                                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg text-white font-mono outline-none transition"
                                    />
                                </div>

                                {/* Campos 4 y 5: Subdirectiva y Teléfono */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                            <span>Subdirectiva / Seccional</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={form.subdirectiva}
                                            onChange={(e) => setForm({ ...form, subdirectiva: e.target.value })}
                                            placeholder="Ej: Bogotá Central"
                                            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg text-white outline-none transition"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
                                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                                            <span>Teléfono / Celular</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={form.telefono}
                                            onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                                            placeholder="Ej: 3101234567"
                                            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-lg text-white font-mono outline-none transition"
                                        />
                                    </div>
                                </div>

                                {errorMsg && (
                                    <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl flex items-start gap-2 text-rose-300 text-xs">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                        <span>{errorMsg}</span>
                                    </div>
                                )}

                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={enviando}
                                        className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white font-semibold rounded-xl transition cursor-pointer shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2"
                                    >
                                        {enviando ? (
                                            <>
                                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                <span>Verificando y radicando...</span>
                                            </>
                                        ) : (
                                            <>
                                                <UserPlus className="w-4 h-4" />
                                                <span>Radicar Solicitud de Inscripción</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        )
                    )}

                    {/* ---------------- PESTAÑA: CONSULTAR ESTADO ---------------- */}
                    {pestaña === 'CONSULTAR' && (
                        <div className="space-y-4 text-xs">
                            <form onSubmit={handleConsultarEstado} className="space-y-3">
                                <div>
                                    <label className="block text-slate-300 font-semibold mb-1">
                                        Ingrese su Cédula / Documento de Identidad
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            required
                                            value={docConsulta}
                                            onChange={(e) => setDocConsulta(e.target.value)}
                                            placeholder="Ej: 1098765432"
                                            className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-lg text-white font-mono outline-none"
                                        />
                                        <button
                                            type="submit"
                                            disabled={consultando}
                                            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5"
                                        >
                                            {consultando ? (
                                                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <Search className="w-3.5 h-3.5" />
                                            )}
                                            <span>Consultar</span>
                                        </button>
                                    </div>
                                </div>
                            </form>

                            {errorMsg && (
                                <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl flex items-start gap-2 text-rose-300 text-xs">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                    <span>{errorMsg}</span>
                                </div>
                            )}

                            {/* Resultados de la Consulta */}
                            {consultaRealizada && resultadoConsulta && (
                                <div className="space-y-3 pt-1 animate-in fade-in duration-200">
                                    {/* 1. Estado en Censo Oficial */}
                                    {resultadoConsulta.estaEnCenso ? (
                                        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/60 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                                    <span className="font-bold text-emerald-200 text-sm">
                                                        Incorporado en Censo Oficial
                                                    </span>
                                                </div>
                                                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-900 text-emerald-300">
                                                    HABILITADO
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-300">
                                                Elector: <strong>{resultadoConsulta.datosCenso?.nombre}</strong>
                                            </p>
                                            <p className="text-[11px] text-slate-400">
                                                Este documento ya se encuentra registrado y activo en el padrón general de votantes. Puede ingresar directamente al Portal de Voto con sus credenciales.
                                            </p>
                                        </div>
                                    ) : null}

                                    {/* 2. Estado de la Solicitud Radicada */}
                                    {resultadoConsulta.solicitud ? (
                                        <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <span className="text-[10px] text-slate-500 font-mono uppercase block">Radicado</span>
                                                    <span className="font-mono font-bold text-white text-xs">
                                                        {resultadoConsulta.solicitud.codigo_radicado}
                                                    </span>
                                                </div>
                                                <div>
                                                    {resultadoConsulta.solicitud.estado === 'PENDIENTE' && (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800/60">
                                                            <Clock className="w-3 h-3 text-amber-400" /> En Revisión (Pendiente)
                                                        </span>
                                                    )}
                                                    {resultadoConsulta.solicitud.estado === 'APROBADA' && (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                                                            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Aprobada Oficialmente
                                                        </span>
                                                    )}
                                                    {resultadoConsulta.solicitud.estado === 'RECHAZADA' && (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800/60">
                                                            <XCircle className="w-3 h-3 text-rose-400" /> Solicitud Rechazada
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-800/80">
                                                <div>
                                                    <span className="text-slate-500 block">Elector:</span>
                                                    <span className="text-slate-200 font-semibold">
                                                        {resultadoConsulta.solicitud.nombres} {resultadoConsulta.solicitud.apellidos}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-500 block">Subdirectiva:</span>
                                                    <span className="text-slate-200">
                                                        {resultadoConsulta.solicitud.subdirectiva || 'General'}
                                                    </span>
                                                </div>
                                                <div className="col-span-2">
                                                    <span className="text-slate-500 block">Fecha de Radicación:</span>
                                                    <span className="text-slate-300 font-mono">
                                                        {new Date(resultadoConsulta.solicitud.creado_at).toLocaleString('es-CO')}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Si fue rechazada, mostrar motivo */}
                                            {resultadoConsulta.solicitud.estado === 'RECHAZADA' && resultadoConsulta.solicitud.motivo_rechazo && (
                                                <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-900/50 text-[11px] text-rose-300 space-y-1">
                                                    <span className="font-bold block">Motivo de Rechazo Institucional:</span>
                                                    <p>{resultadoConsulta.solicitud.motivo_rechazo}</p>
                                                    <p className="text-[10px] text-slate-400 mt-1">
                                                        Puede corregir sus datos y presentar una nueva solicitud de inscripción.
                                                    </p>
                                                </div>
                                            )}

                                            {/* Si fue revisada */}
                                            {resultadoConsulta.solicitud.revisado_por && (
                                                <div className="text-[10px] text-slate-500 font-mono">
                                                    Revisado por: {resultadoConsulta.solicitud.revisado_por} ({resultadoConsulta.solicitud.revisado_rol})
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        !resultadoConsulta.estaEnCenso && (
                                            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-slate-400">
                                                No se encontró ninguna solicitud de registro radicada con el documento <strong>{docConsulta}</strong>.
                                            </div>
                                        )
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="bg-slate-900/80 border-t border-slate-800 p-3.5 sm:px-6 flex items-center justify-between text-[11px] text-slate-500">
                    <div className="flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-slate-400" />
                        <span>Tribunal Electoral Autónomo</span>
                    </div>
                    <span>Auditoría Continua</span>
                </div>
            </div>
        </div>
    );
};
