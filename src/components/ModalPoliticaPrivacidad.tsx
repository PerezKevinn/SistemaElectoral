import React, { useState } from 'react';
import {
    ShieldCheck,
    Lock,
    FileText,
    CheckCircle2,
    EyeOff,
    UserCheck,
    Clock,
    Scale,
    X,
    Printer,
} from 'lucide-react';

interface ModalPoliticaPrivacidadProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ModalPoliticaPrivacidad: React.FC<ModalPoliticaPrivacidadProps> = ({ isOpen, onClose }) => {
    const [seccionActiva, setSeccionActiva] = useState<'RESUMEN' | 'COMPLETO' | 'VOTO_SECRETO' | 'DERECHOS'>('RESUMEN');

    if (!isOpen) return null;

    const handleImprimir = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-200">
            <div className="max-w-3xl w-full glass-panel border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

                {/* Header Institucional */}
                <div className="bg-slate-900/95 border-b border-slate-800 p-4 sm:p-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-950/90 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-md">
                            <Scale className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-indigo-400">
                                    Marco Legal y Estatutario
                                </span>
                                <span className="w-1 h-1 rounded-full bg-slate-600" />
                                <span className="text-[10px] text-slate-400">Ley 1581 / Habeas Data</span>
                            </div>
                            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                                Política de Tratamiento de Datos y Garantías Electorales
                            </h2>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={handleImprimir}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer text-xs flex items-center gap-1 px-2.5"
                            title="Imprimir documento legal"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Imprimir</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                            title="Cerrar ventana"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Barra de Navegación de Secciones */}
                <div className="grid grid-cols-2 sm:grid-cols-4 p-1.5 bg-slate-950/90 border-b border-slate-800 text-xs gap-1">
                    <button
                        type="button"
                        onClick={() => setSeccionActiva('RESUMEN')}
                        className={`py-2 px-3 rounded-lg font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${seccionActiva === 'RESUMEN'
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                            }`}
                    >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Resumen Legal</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setSeccionActiva('VOTO_SECRETO')}
                        className={`py-2 px-3 rounded-lg font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${seccionActiva === 'VOTO_SECRETO'
                                ? 'bg-emerald-600 text-white shadow-md'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                            }`}
                    >
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Voto Secreto</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setSeccionActiva('DERECHOS')}
                        className={`py-2 px-3 rounded-lg font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${seccionActiva === 'DERECHOS'
                                ? 'bg-cyan-600 text-white shadow-md'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                            }`}
                    >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Derechos ARCO</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setSeccionActiva('COMPLETO')}
                        className={`py-2 px-3 rounded-lg font-semibold transition cursor-pointer flex items-center justify-center gap-1.5 ${seccionActiva === 'COMPLETO'
                                ? 'bg-slate-700 text-white shadow-md'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                            }`}
                    >
                        <Scale className="w-3.5 h-3.5" />
                        <span>Texto Completo</span>
                    </button>
                </div>

                {/* Contenido Principal */}
                <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 text-xs text-slate-300 leading-relaxed print:text-black">

                    {/* SECCIÓN 1: RESUMEN EJECUTIVO */}
                    {seccionActiva === 'RESUMEN' && (
                        <div className="space-y-4 animate-in fade-in duration-150">
                            <div className="p-4 bg-indigo-950/30 border border-indigo-900/50 rounded-xl space-y-2">
                                <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm">
                                    <ShieldCheck className="w-5 h-5 text-indigo-400" />
                                    <span>Declaración de Cumplimiento Legal y Estatutario</span>
                                </div>
                                <p className="text-slate-300 text-xs">
                                    El presente Sistema de Votación y Escrutinio Digital opera bajo estricto cumplimiento de la <strong>Ley Estatutaria 1581 de 2012</strong> (Régimen General de Protección de Datos Personales), el Decreto Reglamentario 1377 de 2013, los Artículos 388 y 390 del Código Sustantivo del Trabajo de Colombia, el Convenio 87 de la OIT sobre Libertad Sindical y el Artículo 258 de la Constitución Política de Colombia.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1.5">
                                    <div className="flex items-center gap-2 font-bold text-emerald-300 text-xs">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                        <span>1. Finalidad Exclusiva</span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 leading-normal">
                                        Los datos personales recolectados (documento de identidad, nombres, correo institucional, subdirectiva y teléfono) se usan <strong>única y exclusivamente</strong> para validar su habilitación estatutaria en el censo electoral y remitir sus credenciales privadas de acceso.
                                    </p>
                                </div>

                                <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1.5">
                                    <div className="flex items-center gap-2 font-bold text-cyan-300 text-xs">
                                        <EyeOff className="w-4 h-4 text-cyan-400" />
                                        <span>2. Secreto Inviolable del Voto</span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 leading-normal">
                                        Garantizamos el <strong>anonimato absoluto</strong> de su elección. El sistema disocia de forma estricta su identidad personal del sentido de su voto, asegurando que nadie pueda conocer ni rastrear por quién votó.
                                    </p>
                                </div>

                                <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1.5">
                                    <div className="flex items-center gap-2 font-bold text-purple-300 text-xs">
                                        <Lock className="w-4 h-4 text-purple-400" />
                                        <span>3. Confidencialidad y Seguridad</span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 leading-normal">
                                        Sus contraseñas y accesos se resguardan bajo estrictos estándares de seguridad y cifrado. <strong>Ningún administrador, jurado o directivo sindical tiene acceso ni puede visualizar sus contraseñas.</strong>
                                    </p>
                                </div>

                                <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1.5">
                                    <div className="flex items-center gap-2 font-bold text-amber-300 text-xs">
                                        <Clock className="w-4 h-4 text-amber-400" />
                                        <span>4. Caducidad y Supresión Segura</span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 leading-normal">
                                        Finalizado el proceso electoral y el período estatutario de impugnaciones, los accesos temporales y la información operativa no requerida para el acta oficial son suprimidos de manera segura.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SECCIÓN 2: GARANTÍA DE VOTO SECRETO */}
                    {seccionActiva === 'VOTO_SECRETO' && (
                        <div className="space-y-4 animate-in fade-in duration-150">
                            <div className="p-4 bg-emerald-950/30 border border-emerald-800/50 rounded-xl space-y-2">
                                <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                                    <EyeOff className="w-5 h-5 text-emerald-400" />
                                    <span>Garantía Constitucional y Estatutaria de Sufragio Secreto</span>
                                </div>
                                <p className="text-slate-300 text-xs">
                                    En cumplimiento del <strong>Artículo 390 del Código Sustantivo del Trabajo</strong> y el <strong>Artículo 258 de la Constitución Política</strong>, la votación es personal, libre, directa y estrictamente secreta.
                                </p>
                            </div>

                            <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-3">
                                <h3 className="font-bold text-white text-xs uppercase tracking-wider">
                                    ¿Cómo protege el sistema el secreto de su voto?
                                </h3>
                                <ul className="space-y-2.5 text-[11px] text-slate-300">
                                    <li className="flex items-start gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                                        <span>
                                            <strong>Separación de Identidad y Voto:</strong> El censo electoral de votantes habilitados se gestiona de manera totalmente independiente a la urna de votación, impidiendo cualquier vinculación entre la persona y su elección.
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                                        <span>
                                            <strong>Habilitación Única de Cabina:</strong> Al identificarse y superar los pasos de autenticación de seguridad, el sistema habilita su derecho al voto de un solo uso y registra su participación en el censo para garantizar que cada elector vote una única vez.
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                                        <span>
                                            <strong>Depósito Confidencial en la Urna:</strong> Al marcar su preferencia en la cabina virtual y confirmar su voto, este ingresa a la urna electrónica de forma anónima, computando únicamente la opción elegida sin registrar su nombre, cédula ni datos de su equipo o conexión.
                                        </span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                                        <span>
                                            <strong>Comprobante Digital de Participación:</strong> Al finalizar la votación, usted recibe un certificado digital que acredita que su voto fue válidamente computado en el escrutinio, sin revelar en ningún momento su decisión electoral.
                                        </span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* SECCIÓN 3: DERECHOS ARCO */}
                    {seccionActiva === 'DERECHOS' && (
                        <div className="space-y-4 animate-in fade-in duration-150">
                            <div className="p-4 bg-cyan-950/30 border border-cyan-800/50 rounded-xl space-y-2">
                                <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm">
                                    <UserCheck className="w-5 h-5 text-cyan-400" />
                                    <span>Derechos del Titular de Datos (Habeas Data)</span>
                                </div>
                                <p className="text-slate-300 text-xs">
                                    Conforme al Artículo 8 de la Ley 1581 de 2012, todo afiliado y votante cuenta con los siguientes derechos inalienables sobre sus datos personales:
                                </p>
                            </div>

                            <div className="space-y-2.5">
                                <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
                                    <strong className="text-white block text-xs mb-1">A. Derecho de Acceso y Consulta:</strong>
                                    <p className="text-[11px] text-slate-400">
                                        Conocer en cualquier momento si se encuentra inscrito y habilitado en el censo electoral oficial a través del módulo de consulta habilitado en el portal.
                                    </p>
                                </div>

                                <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
                                    <strong className="text-white block text-xs mb-1">B. Derecho de Actualización y Rectificación:</strong>
                                    <p className="text-[11px] text-slate-400">
                                        Solicitar la corrección de errores en sus nombres, número de identificación, correo electrónico o subdirectiva asignada con anterioridad al cierre definitivo del censo electoral.
                                    </p>
                                </div>

                                <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
                                    <strong className="text-white block text-xs mb-1">C. Derecho de Supresión (Cancelación):</strong>
                                    <p className="text-[11px] text-slate-400">
                                        Solicitar la eliminación de sus datos de contacto cuando medie causa legal, revocatoria estatutaria o renuncia formal a la afiliación sindical.
                                    </p>
                                </div>

                                <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
                                    <div>
                                        <span className="text-slate-300 font-semibold block text-xs">Canal Oficial para Ejercicio de Habeas Data</span>
                                        <span className="text-slate-400 text-[11px]">Comisión de Garantías Electorales y Protección de Datos</span>
                                    </div>
                                    <span className="px-3 py-1.5 bg-slate-800 text-indigo-300 font-mono text-[11px] rounded-lg border border-slate-700">
                                        soporte@altumsoftware.solutions
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SECCIÓN 4: TEXTO LEGAL COMPLETO */}
                    {seccionActiva === 'COMPLETO' && (
                        <div className="space-y-4 animate-in fade-in duration-150 max-h-[55vh] overflow-y-auto pr-2">
                            <div className="space-y-3 text-[11px] text-slate-300 leading-relaxed">
                                <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-2">
                                    POLÍTICA DE PRIVACIDAD, TRATAMIENTO DE DATOS PERSONALES Y CONDICIONES GENERALES DE LA JORNADA ELECTORAL
                                </h3>

                                <h4 className="font-bold text-indigo-300 uppercase text-xs pt-2">1. Responsable del Tratamiento</h4>
                                <p>
                                    La <strong>Organización Sindical</strong> a través de su <strong>Comisión de Garantías Electorales / Tribunal Electoral Autónomo</strong>, como responsable y custodio del proceso comicial conforme a sus estatutos vigentes.
                                </p>

                                <h4 className="font-bold text-indigo-300 uppercase text-xs pt-2">2. Marco Normativo Aplicable</h4>
                                <p>
                                    Constitución Política de Colombia (Artículos 15, 39 y 258); Ley Estatutaria 1581 de 2012; Decreto Reglamentario 1377 de 2013; Ley 527 de 1999 (Mensajes de Datos y Firmas Digitales); Ley 1273 de 2009 (Protección de la Información y Seguridad Digital); Código Sustantivo del Trabajo (Arts. 388, 390); Convenios 87 y 98 de la Organización Internacional del Trabajo (OIT).
                                </p>

                                <h4 className="font-bold text-indigo-300 uppercase text-xs pt-2">3. Tratamiento de Datos Sensibles (Filiación Sindical)</h4>
                                <p>
                                    El titular reconoce y acepta que la información sobre su pertenencia a la organización sindical constituye un <strong>dato de especial protección (dato sensible)</strong>. Su tratamiento es indispensable y exclusivo para el ejercicio legítimo del derecho de asociación sindical y el sufragio en la jornada democrática, y no será transferido, divulgado ni comercializado a terceros bajo ninguna circunstancia.
                                </p>

                                <h4 className="font-bold text-indigo-300 uppercase text-xs pt-2">4. Medidas y Salvaguardas de Seguridad</h4>
                                <p>
                                    La plataforma implementa controles institucionales de seguridad de la información, que incluyen autenticación de doble factor, almacenamiento seguro y protegido de credenciales de acceso, controles de acceso por roles, mecanismos de protección contra accesos no autorizados y registro formal de auditoría para todas las acciones administrativas de apertura, escrutinio y cierre, asegurando la transparencia e inalterabilidad de los resultados.
                                </p>

                                <h4 className="font-bold text-indigo-300 uppercase text-xs pt-2">5. Conservación de Evidencias y Supresión</h4>
                                <p>
                                    El acta oficial de escrutinio, los certificados consolidados de votación y las bitácoras suscritas por los jurados electorales se conservarán durante el término legal de ejecutoria y prescripción de las acciones correspondientes. Vencido este plazo, la información operativa que no sea requerida por ley será suprimida de manera segura.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Modal */}
                <div className="bg-slate-900/90 border-t border-slate-800 p-3.5 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-400">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <span>Tribunal Electoral • Tratamiento Seguro conforme a la Ley 1581 de 2012</span>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full sm:w-auto px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs transition cursor-pointer shadow-md shadow-indigo-950/50"
                    >
                        Entendido y Aceptar
                    </button>
                </div>
            </div>
        </div>
    );
};

