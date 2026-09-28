import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
    Play,
    Pause,
    RotateCcw,
    Volume2,
    VolumeX,
    Maximize2,
    Minimize2,
    Smartphone,
    ShieldCheck,
    KeyRound,
    Vote,
    CheckCircle2,
    Sparkles,
    Lock,
    UserPlus,
    X,
    ChevronRight,
    ChevronLeft,
    Check,
    Zap,
    UserCheck,
    Gauge,
    Mic,
    SlidersHorizontal,
    FileText,
    Tv,
    Minus,
    Columns,
    PictureInPicture2,
    HelpCircle
} from 'lucide-react';

export type ModoTutorial = 'MODAL' | 'PIP' | 'COMPACT' | 'SIDEBAR';

export interface ModalVideoTutorialProps {
    isOpen: boolean;
    onClose: () => void;
    initialMode?: ModoTutorial;
    initialSceneIndex?: number;
}

export interface EscenaTutorial {
    id: number;
    titulo: string;
    subtitulo: string;
    duracionEstimadaSegundos: number;
    icono: React.ReactNode;
    colorBadge: string;
    locucion: string;
    puntosClave: string[];
    pasoAccion: string;
}

export const ModalVideoTutorial: React.FC<ModalVideoTutorialProps> = ({
    isOpen,
    onClose,
    initialMode = 'MODAL',
    initialSceneIndex = 0
}) => {
    const [modo, setModo] = useState<ModoTutorial>(initialMode);
    const [escenaActual, setEscenaActual] = useState<number>(initialSceneIndex);
    const [reproduciendo, setReproduciendo] = useState<boolean>(false);
    const [audioHabilitado, setAudioHabilitado] = useState<boolean>(true);
    const [pantallaCompleta, setPantallaCompleta] = useState<boolean>(false);
    const [pestanaVista, setPestanaVista] = useState<'VIDEO' | 'GUIA_RAPIDA'>('VIDEO');
    const [mostrarAjustesVoz, setMostrarAjustesVoz] = useState<boolean>(false);
    const [totpAnimado, setTotpAnimado] = useState<string>('482910');
    const [totpCountdown, setTotpCountdown] = useState<number>(24);

    // Configuración y lista de voces
    const [vocesDisponibles, setVocesDisponibles] = useState<SpeechSynthesisVoice[]>([]);
    const [vozSeleccionadaURI, setVozSeleccionadaURI] = useState<string>('');
    const [velocidadVoz, setVelocidadVoz] = useState<number>(0.95);
    const [progresoEscenaPct, setProgresoEscenaPct] = useState<number>(0);
    const [tiempoTranscurridoSeg, setTiempoTranscurridoSeg] = useState<number>(0);

    const videoContainerRef = useRef<HTMLDivElement>(null);
    const timerRef = useRef<any>(null);
    const timeoutNextSceneRef = useRef<any>(null);
    const startTimeRef = useRef<number>(0);
    const animFrameRef = useRef<number | null>(null);

    // Si cambian las props iniciales al abrir
    useEffect(() => {
        if (isOpen) {
            if (initialMode) setModo(initialMode);
            if (typeof initialSceneIndex === 'number') setEscenaActual(initialSceneIndex);
        }
    }, [isOpen, initialMode, initialSceneIndex]);

    const escenas: EscenaTutorial[] = useMemo(() => [
        {
            id: 1,
            titulo: '1. Bienvenido a las Elecciones',
            subtitulo: 'Votación rápida, fácil y 100% secreta',
            duracionEstimadaSegundos: 13,
            icono: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
            colorBadge: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
            locucion: 'Bienvenido al sistema de votación del sindicato. Aquí podrás votar de forma muy fácil, rápida y totalmente segura. Tu voto es privado y nadie sabrá por quién votaste.',
            puntosClave: [
                'Vota desde tu celular o computador',
                'Protegido con un código en tu teléfono',
                'Nadie sabrá por quién votaste: es 100% privado',
            ],
            pasoAccion: 'Comienza ingresando tus datos en el portal de inicio.',
        },
        {
            id: 2,
            titulo: '2. ¿No estás en la lista? Regístrate aquí',
            subtitulo: 'Pide tu inscripción en menos de un minuto',
            duracionEstimadaSegundos: 15,
            icono: <UserPlus className="w-4 h-4 text-blue-400" />,
            colorBadge: 'bg-blue-500/10 border-blue-500/30 text-blue-300',
            locucion: 'Si no apareces en la lista o necesitas actualizar tus datos, haz clic en "¿No figura en el censo?". Llena tus datos básicos: cédula, nombre, correo, sede y teléfono. Al enviar, recibirás un número de radicado para hacerle seguimiento.',
            puntosClave: [
                'Formulario sencillo con tus datos básicos',
                'Recibes tu número de radicado al instante',
                'El comité revisa y aprueba tu solicitud',
            ],
            pasoAccion: 'Haz clic en "¿No figura en el censo?" si aún no estás registrado.',
        },
        {
            id: 3,
            titulo: '3. Ingreso y Creación de tu Clave',
            subtitulo: 'Crea una clave personal que solo tú conozcas',
            duracionEstimadaSegundos: 14,
            icono: <Lock className="w-4 h-4 text-amber-400" />,
            colorBadge: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
            locucion: 'Ingresa con tu número de cédula y la clave inicial que te entregaron. La primera vez que entres, el sistema te pedirá crear una clave nueva y personal de mínimo 6 letras o números. Así tu cuenta queda totalmente protegida.',
            puntosClave: [
                'Escribe tu cédula y clave inicial',
                'Crea tu clave nueva y personal (mín. 6 dígitos)',
                'Solo tú tendrás acceso a tu votación',
            ],
            pasoAccion: 'Escribe tu cédula y cambia tu contraseña temporal por una nueva.',
        },
        {
            id: 4,
            titulo: '4. Conectar con tu Celular',
            subtitulo: 'Escanea el código con Google Authenticator',
            duracionEstimadaSegundos: 16,
            icono: <Smartphone className="w-4 h-4 text-purple-400" />,
            colorBadge: 'bg-purple-500/10 border-purple-500/30 text-purple-300',
            locucion: 'Para asegurar que nadie vote por ti, usaremos la aplicación Google Authenticator en tu celular. Descárgala gratis en tu teléfono, ábrela, toca el botón de más (+) y apunta la cámara al código en pantalla. Si no puedes escanearlo, también puedes escribir la clave manual.',
            puntosClave: [
                'Descarga gratis Google Authenticator en tu celular',
                'Toca el botón (+) y apunta tu cámara al código QR',
                'O copia la clave manual si tu cámara no lee el código',
            ],
            pasoAccion: 'Abre Authenticator en tu teléfono y lee el código QR en pantalla.',
        },
        {
            id: 5,
            titulo: '5. Ingresa el Código de tu Celular',
            subtitulo: 'Escribe el número de 6 dígitos que aparece en la app',
            duracionEstimadaSegundos: 13,
            icono: <KeyRound className="w-4 h-4 text-teal-400" />,
            colorBadge: 'bg-teal-500/10 border-teal-500/30 text-teal-300',
            locucion: 'La aplicación en tu celular te mostrará un código de 6 números que cambia cada 30 segundos. Escribe ese código en la pantalla y presiona "Habilitar Voto". Con esto confirmamos que realmente eres tú.',
            puntosClave: [
                'Mira el código de 6 números en tu teléfono',
                'Escríbelo antes de que el círculo de 30s termine',
                'Presiona "Habilitar Voto" para ingresar a la cabina',
            ],
            pasoAccion: 'Digita los 6 números que te da la app en tu celular y pulsa Habilitar Voto.',
        },
        {
            id: 6,
            titulo: '6. Tu Voto es 100% Secreto',
            subtitulo: 'Tu nombre y cédula no se guardan con tu voto',
            duracionEstimadaSegundos: 15,
            icono: <Zap className="w-4 h-4 text-indigo-400" />,
            colorBadge: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300',
            locucion: 'Aquí ocurre lo más importante: el sistema anota que ya participaste, pero entrega una papeleta digital totalmente anónima. Nadie puede saber por quién votaste, ni los directivos, ni los organizadores. Tu voto es completamente secreto.',
            puntosClave: [
                'El sistema registra que ya participaste',
                'Tu cédula queda separada de tu papeleta',
                'Nadie sabrá cuál fue tu elección: anonimato absoluto',
            ],
            pasoAccion: 'Tu identidad y tu voto están protegidos por cifrado independiente.',
        },
        {
            id: 7,
            titulo: '7. Elige tu Candidato y Vota',
            subtitulo: 'Marca tu preferencia y deposita tu voto',
            duracionEstimadaSegundos: 14,
            icono: <Vote className="w-4 h-4 text-emerald-400" />,
            colorBadge: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
            locucion: 'En la pantalla de votación verás a los candidatos y sus listas. Haz clic sobre el candidato de tu preferencia, presiona "Continuar", revisa que todo esté bien y haz clic en "Confirmar y Depositar". Tu voto quedará guardado en la urna virtual.',
            puntosClave: [
                'Mira las listas y candidatos disponibles',
                'Toca sobre el candidato que prefieras',
                'Confirma tu elección para depositar tu voto',
            ],
            pasoAccion: 'Selecciona tu candidato preferido en la tarjeta y pulsa Confirmar.',
        },
        {
            id: 8,
            titulo: '8. ¡Listo! Guarda tu Comprobante',
            subtitulo: 'Tu voto fue registrado exitosamente',
            duracionEstimadaSegundos: 14,
            icono: <CheckCircle2 className="w-4 h-4 text-cyan-400" />,
            colorBadge: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300',
            locucion: '¡Felicitaciones, ya votaste! La pantalla te mostrará un código de comprobante. Puedes copiarlo y guardarlo para comprobar que tu voto fue contado en el resultado final. ¡Gracias por participar!',
            puntosClave: [
                'Tu voto quedó guardado con éxito',
                'Recibes un código único de comprobante',
                'Cierra la sesión de forma tranquila y segura',
            ],
            pasoAccion: 'Copia tu código de comprobante para futuras consultas y auditoría.',
        },
    ], []);

    // Cargar y ordenar voces en español, priorizando voces naturales
    const cargarVoces = useCallback(() => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

        const todasVoces = window.speechSynthesis.getVoices();
        if (!todasVoces || todasVoces.length === 0) return;

        const mapaVoces = new Map<string, SpeechSynthesisVoice>();
        todasVoces
            .filter((v) => v.lang.toLowerCase().startsWith('es'))
            .forEach((v) => {
                const key = v.voiceURI || v.name;
                if (!mapaVoces.has(key)) {
                    mapaVoces.set(key, v);
                }
            });

        const vocesEs = Array.from(mapaVoces.values());

        const puntuacionVoz = (v: SpeechSynthesisVoice) => {
            const nombre = v.name.toLowerCase();
            let score = 0;
            if (nombre.includes('natural') || nombre.includes('neural') || nombre.includes('online')) score += 100;
            if (nombre.includes('google')) score += 80;
            if (nombre.includes('jorge') || nombre.includes('sabina') || nombre.includes('gonzalo') || nombre.includes('salome') || nombre.includes('elena') || nombre.includes('paulina') || nombre.includes('monica')) score += 50;
            if (v.lang.toLowerCase() === 'es-co' || v.lang.toLowerCase() === 'es-mx' || v.lang.toLowerCase() === 'es-es') score += 20;
            return score;
        };

        const ordenadas = [...vocesEs].sort((a, b) => puntuacionVoz(b) - puntuacionVoz(a));
        setVocesDisponibles(ordenadas);

        if (ordenadas.length > 0 && !vozSeleccionadaURI) {
            setVozSeleccionadaURI(ordenadas[0].voiceURI);
        }
    }, [vozSeleccionadaURI]);

    useEffect(() => {
        cargarVoces();
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.onvoiceschanged = cargarVoces;
        }
    }, [cargarVoces]);

    // Simulación del temporizador de Google Authenticator
    useEffect(() => {
        const interval = setInterval(() => {
            setTotpCountdown((prev) => {
                if (prev <= 1) {
                    const nuevo = Math.floor(100000 + Math.random() * 900000).toString();
                    setTotpAnimado(nuevo);
                    return 30;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const limpiarTimers = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (timeoutNextSceneRef.current) clearTimeout(timeoutNextSceneRef.current);
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    };

    // Función para reproducir la escena actual con control exacto de fin de mensaje
    const reproducirEscenaActual = useCallback((index: number) => {
        limpiarTimers();
        const escena = escenas[index];
        if (!escena) return;

        setProgresoEscenaPct(0);
        setTiempoTranscurridoSeg(0);
        startTimeRef.current = Date.now();

        if (audioHabilitado && typeof window !== 'undefined' && 'speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(escena.locucion);
            utterance.lang = 'es-ES';
            utterance.rate = velocidadVoz;
            utterance.pitch = 1.0;

            if (vozSeleccionadaURI) {
                const voz = vocesDisponibles.find((v) => v.voiceURI === vozSeleccionadaURI);
                if (voz) utterance.voice = voz;
            } else if (vocesDisponibles.length > 0) {
                utterance.voice = vocesDisponibles[0];
            }

            const palabras = escena.locucion.split(' ').length;
            const duracionEstimadaMs = Math.max(7000, (palabras / (2.6 * velocidadVoz)) * 1000);

            const updateProgress = () => {
                const elapsed = Date.now() - startTimeRef.current;
                const pct = Math.min(95, Math.round((elapsed / duracionEstimadaMs) * 100));
                setProgresoEscenaPct(pct);
                setTiempoTranscurridoSeg(Math.floor(elapsed / 1000));

                if (reproduciendo) {
                    animFrameRef.current = requestAnimationFrame(updateProgress);
                }
            };
            animFrameRef.current = requestAnimationFrame(updateProgress);

            utterance.onend = () => {
                if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
                setProgresoEscenaPct(100);

                timeoutNextSceneRef.current = setTimeout(() => {
                    setEscenaActual((curr) => {
                        if (curr < escenas.length - 1) {
                            return curr + 1;
                        } else {
                            setReproduciendo(false);
                            return curr;
                        }
                    });
                }, 1400);
            };

            utterance.onerror = (err) => {
                console.warn('SpeechSynthesis error/cancel:', err);
            };

            window.speechSynthesis.speak(utterance);
        } else {
            const palabras = escena.locucion.split(' ').length;
            const duracionLecturaSeg = Math.max(8, Math.round(palabras / 2.8) + 3);

            timerRef.current = setInterval(() => {
                const elapsedSeg = Math.floor((Date.now() - startTimeRef.current) / 1000);
                setTiempoTranscurridoSeg(elapsedSeg);
                const pct = Math.min(100, Math.round((elapsedSeg / duracionLecturaSeg) * 100));
                setProgresoEscenaPct(pct);

                if (elapsedSeg >= duracionLecturaSeg) {
                    clearInterval(timerRef.current);
                    setEscenaActual((curr) => {
                        if (curr < escenas.length - 1) {
                            return curr + 1;
                        } else {
                            setReproduciendo(false);
                            return curr;
                        }
                    });
                }
            }, 500);
        }
    }, [audioHabilitado, escenas, reproduciendo, velocidadVoz, vocesDisponibles, vozSeleccionadaURI]);

    useEffect(() => {
        if (reproduciendo && isOpen) {
            reproducirEscenaActual(escenaActual);
        } else {
            limpiarTimers();
        }

        return () => {
            limpiarTimers();
        };
    }, [reproduciendo, escenaActual, isOpen, reproducirEscenaActual]);

    const cambiarEscena = (index: number) => {
        limpiarTimers();
        setEscenaActual(index);
        setProgresoEscenaPct(0);
        setTiempoTranscurridoSeg(0);
    };

    const togglePlay = () => {
        if (!reproduciendo && escenaActual === escenas.length - 1 && progresoEscenaPct >= 99) {
            setEscenaActual(0);
            setProgresoEscenaPct(0);
        }
        setReproduciendo(!reproduciendo);
    };

    const reiniciar = () => {
        limpiarTimers();
        setEscenaActual(0);
        setProgresoEscenaPct(0);
        setTiempoTranscurridoSeg(0);
        setReproduciendo(true);
    };

    const toggleAudio = () => {
        limpiarTimers();
        setAudioHabilitado(!audioHabilitado);
        if (reproduciendo) {
            setTimeout(() => {
                reproducirEscenaActual(escenaActual);
            }, 100);
        }
    };

    if (!isOpen) return null;

    const escena = escenas[escenaActual];
    const duracionTotal = escenas.reduce((acc, e) => acc + e.duracionEstimadaSegundos, 0);
    const tiempoTranscurridoPrevio = escenas.slice(0, escenaActual).reduce((acc, e) => acc + e.duracionEstimadaSegundos, 0);
    const progresoTotalPct = Math.min(
        100,
        Math.round(((tiempoTranscurridoPrevio + (escena.duracionEstimadaSegundos * progresoEscenaPct) / 100) / duracionTotal) * 100)
    );

    // =========================================================================
    // COMPONENTE VISUAL MOCKUP POR ESCENA (Reutilizable para Modal, PiP y Sidebar)
    // =========================================================================
    const renderVisualEscena = (isMini: boolean) => {
        switch (escenaActual) {
            case 0: // Escena 1: Bienvenida
                return (
                    <div className={`text-center space-y-2 max-w-xl animate-fade-in w-full ${isMini ? 'py-1' : 'space-y-4'}`}>
                        <div className={`${isMini ? 'w-10 h-10' : 'w-16 h-16'} mx-auto rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-lg shadow-emerald-950`}>
                            <div className="w-full h-full bg-slate-950 rounded-2xl flex items-center justify-center text-emerald-400">
                                <ShieldCheck className={isMini ? 'w-5 h-5 animate-pulse' : 'w-8 h-8 animate-pulse'} />
                            </div>
                        </div>
                        <div>
                            <h3 className={`${isMini ? 'text-xs' : 'text-xl'} font-extrabold text-white tracking-tight`}>
                                Votación Digital Segura
                            </h3>
                            <p className={`${isMini ? 'text-[10px]' : 'text-xs sm:text-sm'} text-slate-300 max-w-md mx-auto line-clamp-2`}>
                                Vota de forma 100% secreta, rápida y protegida desde cualquier celular o PC.
                            </p>
                        </div>
                        {!isMini && (
                            <div className="grid grid-cols-3 gap-2 pt-1 max-w-md mx-auto">
                                <div className="p-2 bg-slate-950/80 border border-slate-800 rounded-xl">
                                    <Smartphone className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                                    <span className="text-[10px] font-bold text-slate-200 block">En tu Celular</span>
                                </div>
                                <div className="p-2 bg-slate-950/80 border border-slate-800 rounded-xl">
                                    <Zap className="w-4 h-4 text-indigo-400 mx-auto mb-1" />
                                    <span className="text-[10px] font-bold text-slate-200 block">Voto Secreto</span>
                                </div>
                                <div className="p-2 bg-slate-950/80 border border-slate-800 rounded-xl">
                                    <Lock className="w-4 h-4 text-teal-400 mx-auto mb-1" />
                                    <span className="text-[10px] font-bold text-slate-200 block">Confiable</span>
                                </div>
                            </div>
                        )}
                    </div>
                );

            case 1: // Escena 2: Registro Censo
                return (
                    <div className={`w-full max-w-2xl ${isMini ? 'space-y-1.5' : 'grid grid-cols-1 sm:grid-cols-2 gap-3'} items-center animate-fade-in`}>
                        <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-2.5 text-left shadow-lg space-y-1">
                            <div className="flex items-center gap-1.5 border-b border-slate-800 pb-1">
                                <UserPlus className="w-3.5 h-3.5 text-blue-400" />
                                <span className="text-[10px] font-bold text-white uppercase">Formulario de Censo</span>
                            </div>
                            <div className="space-y-1 text-[10px]">
                                <div className="flex justify-between items-center bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                    <span className="text-slate-400">Cédula:</span>
                                    <span className="text-slate-200 font-mono">1098765432</span>
                                </div>
                                <div className="flex justify-between items-center bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                    <span className="text-slate-400">Nombre:</span>
                                    <span className="text-slate-200 truncate max-w-[140px]">CARLOS MENDOZA</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-950/30 border border-blue-500/30 rounded-xl p-2 text-center space-y-1">
                            <div className="flex items-center justify-center gap-1 text-blue-400 text-[11px] font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Radicado Asignado</span>
                            </div>
                            <div className="px-2 py-0.5 bg-slate-900/90 border border-blue-500/40 rounded font-mono text-emerald-400 text-xs font-bold">
                                RAD-2026-9843
                            </div>
                        </div>
                    </div>
                );

            case 2: // Escena 3: Cambio Contraseña
                return (
                    <div className="w-full max-w-md bg-slate-950/90 border border-slate-800 rounded-xl p-3 shadow-xl space-y-2 text-left animate-fade-in">
                        <div className="p-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-2">
                            <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <div>
                                <span className="text-[10px] font-bold text-amber-300 block">Crea tu Nueva Clave Personal</span>
                                <span className="text-[9px] text-amber-200/80">Cambia la clave inicial por una de 6+ caracteres</span>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <div className="p-1.5 bg-slate-900 border border-slate-700 rounded text-slate-100 font-mono text-[11px] flex justify-between items-center">
                                <span>••••••••••••</span>
                                <span className="text-[9px] text-emerald-400 font-semibold">Segura ✓</span>
                            </div>
                            <div className="p-1 bg-amber-600/90 text-white text-center rounded text-[10px] font-bold">
                                Guardar Clave y Continuar →
                            </div>
                        </div>
                    </div>
                );

            case 3: // Escena 4: Authenticator QR
                return (
                    <div className="w-full max-w-lg grid grid-cols-2 gap-2 items-center animate-fade-in">
                        <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-2 text-center space-y-1">
                            <span className="text-[9px] font-bold text-slate-300 uppercase block">1. Escanea QR</span>
                            <div className="p-1 bg-white rounded inline-block shadow">
                                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-950 rounded flex flex-col items-center justify-center p-0.5 relative overflow-hidden">
                                    <div className="grid grid-cols-5 gap-0.5 w-full h-full opacity-90">
                                        {Array.from({ length: 25 }).map((_, i) => (
                                            <div
                                                key={i}
                                                className={`rounded-xs ${i % 2 === 0 || i % 3 === 0 ? 'bg-white' : 'bg-slate-950'}`}
                                            />
                                        ))}
                                    </div>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="p-0.5 bg-emerald-500 text-slate-950 rounded font-bold text-[7px]">
                                            APP
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-950 border-2 border-slate-800 rounded-2xl p-2 shadow-xl space-y-1 text-left">
                            <div className="flex items-center gap-1 border-b border-slate-800 pb-0.5">
                                <div className="w-3 h-3 rounded-full bg-gradient-to-tr from-red-500 via-yellow-400 to-blue-500 flex items-center justify-center text-[7px] font-bold text-white">
                                    G
                                </div>
                                <span className="text-[9px] font-bold text-white">Authenticator</span>
                            </div>
                            <div className="p-1.5 bg-slate-900 border border-slate-700 rounded space-y-0.5">
                                <span className="text-[7px] text-slate-400 block font-mono">Elecciones</span>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-bold font-mono text-blue-400 tracking-wider">
                                        {totpAnimado.slice(0, 3)} {totpAnimado.slice(3)}
                                    </span>
                                    <span className="text-[8px] font-mono text-cyan-300 bg-slate-950 px-1 rounded">
                                        {totpCountdown}s
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 4: // Escena 5: TOTP 6 dígitos
                return (
                    <div className="w-full max-w-md bg-slate-950/90 border border-slate-800 rounded-xl p-2.5 shadow-xl text-center space-y-2 animate-fade-in">
                        <div className="flex items-center justify-center gap-1.5 text-teal-400 text-xs font-bold">
                            <KeyRound className="w-4 h-4" />
                            <span>Ingresa el Código de 6 Dígitos</span>
                        </div>
                        <div className="flex justify-center gap-1 font-mono">
                            {totpAnimado.split('').map((digito, idx) => (
                                <div
                                    key={idx}
                                    className="w-7 h-8 sm:w-9 sm:h-10 bg-slate-900 border-2 border-emerald-500/80 rounded-lg flex items-center justify-center text-sm sm:text-base font-bold text-emerald-400 shadow animate-pulse"
                                >
                                    {digito}
                                </div>
                            ))}
                        </div>
                        <div className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold">
                            Habilitar Voto Seguro →
                        </div>
                    </div>
                );

            case 5: // Escena 6: Voto Secreto Separado
                return (
                    <div className="w-full max-w-md bg-slate-950/90 border border-slate-800 rounded-xl p-2.5 shadow-xl text-center space-y-2 animate-fade-in">
                        <div className="grid grid-cols-3 gap-1.5 items-center text-left">
                            <div className="p-1.5 bg-slate-900 border border-slate-700 rounded-lg text-[9px]">
                                <div className="text-blue-400 font-bold flex items-center gap-1">
                                    <UserCheck className="w-3 h-3" />
                                    <span>Padrón</span>
                                </div>
                                <span className="text-emerald-300 block font-bold mt-0.5">✓ Ya Votó</span>
                            </div>
                            <div className="text-center">
                                <span className="text-[8px] font-bold text-indigo-300 uppercase block">Separados</span>
                                <Zap className="w-3.5 h-3.5 text-indigo-400 mx-auto" />
                            </div>
                            <div className="p-1.5 bg-slate-900 border border-emerald-500/40 rounded-lg text-[9px]">
                                <div className="text-emerald-400 font-bold flex items-center gap-1">
                                    <Vote className="w-3 h-3" />
                                    <span>Urna</span>
                                </div>
                                <span className="text-indigo-300 block font-mono font-bold mt-0.5">Anónimo</span>
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-300">
                            Nadie puede asociar tu nombre con tu voto. Es 100% privado.
                        </p>
                    </div>
                );

            case 6: // Escena 7: Cabina Votación
                return (
                    <div className="w-full max-w-md bg-slate-950/90 border border-slate-800 rounded-xl p-2.5 shadow-xl text-left space-y-1.5 animate-fade-in">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                            <span className="text-[10px] font-bold text-white uppercase">Elige tu Lista</span>
                            <span className="text-[8px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/30">
                                Papeleta Oficial
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                            <div className="p-1.5 rounded-lg border-2 border-emerald-500 bg-emerald-950/40 flex items-center justify-between shadow">
                                <div className="flex items-center gap-1">
                                    <span className="w-5 h-5 rounded bg-emerald-500 text-slate-950 font-bold text-[10px] flex items-center justify-center">
                                        #1
                                    </span>
                                    <span className="text-[10px] font-bold text-white">LISTA 1</span>
                                </div>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            </div>
                            <div className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/60 opacity-60 flex items-center gap-1">
                                <span className="w-5 h-5 rounded bg-slate-800 text-slate-400 font-bold text-[10px] flex items-center justify-center">
                                    #2
                                </span>
                                <span className="text-[10px] font-bold text-slate-400">LISTA 2</span>
                            </div>
                        </div>
                        <div className="p-1.5 bg-emerald-600 text-white text-center rounded-lg text-[10px] font-bold">
                            ✓ Confirmar y Depositar Mi Voto
                        </div>
                    </div>
                );

            case 7: // Escena 8: Comprobante
                return (
                    <div className="w-full max-w-md bg-slate-950/90 border border-slate-800 rounded-xl p-2.5 shadow-xl text-center space-y-1.5 animate-fade-in">
                        <div className="flex items-center justify-center gap-1 text-emerald-400 text-xs font-bold">
                            <ShieldCheck className="w-4 h-4" />
                            <span>¡Voto Registrado con Éxito!</span>
                        </div>
                        <div className="bg-slate-900 p-1.5 rounded-lg border border-slate-800 text-left">
                            <span className="block text-[8px] font-bold text-slate-400 uppercase font-mono">
                                Comprobante Criptográfico
                            </span>
                            <code className="text-[9px] text-emerald-400 font-mono break-all block p-1 bg-slate-950 rounded border border-slate-800 mt-0.5">
                                7f9c2d1b8e4f5a3c0d2e1b9a8f7c6e5d...
                            </code>
                        </div>
                        <div className="text-[9px] text-slate-300 flex items-center justify-center gap-1">
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span>Listo para auditar en el escrutinio final</span>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    // =========================================================================
    // MODO 1: BARRA COMPACTA MINIMIZADA (Píldora flotante en esquina inferior)
    // =========================================================================
    if (modo === 'COMPACT') {
        return (
            <div className="fixed bottom-4 right-4 z-50 pointer-events-auto animate-fade-in">
                <div className="bg-slate-950/95 backdrop-blur-xl border border-emerald-500/50 rounded-2xl p-2.5 sm:p-3 shadow-2xl shadow-emerald-950/70 flex items-center gap-2.5 ring-1 ring-emerald-500/30 max-w-[94vw] sm:max-w-md">
                    {/* Indicador pulsante */}
                    <button
                        onClick={() => setModo('PIP')}
                        className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-emerald-950/50 shrink-0 cursor-pointer hover:scale-105 transition"
                        title="Expandir a mini reproductor"
                    >
                        <Sparkles className="w-4 h-4" />
                    </button>

                    <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setModo('PIP')}>
                        <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                                Tutorial Paso a Paso ({escenaActual + 1}/8)
                            </span>
                        </div>
                        <p className="text-xs font-bold text-white truncate">
                            {escena.titulo}
                        </p>
                    </div>

                    {/* Controles rápidos */}
                    <div className="flex items-center gap-1 shrink-0">
                        <button
                            onClick={togglePlay}
                            className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition cursor-pointer"
                            title={reproduciendo ? 'Pausar' : 'Reproducir'}
                        >
                            {reproduciendo ? <Pause className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                        </button>

                        <button
                            onClick={toggleAudio}
                            className={`p-1.5 rounded-lg border transition cursor-pointer ${
                                audioHabilitado ? 'bg-slate-900 border-slate-800 text-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-500'
                            }`}
                            title={audioHabilitado ? 'Silenciar voz' : 'Activar voz'}
                        >
                            {audioHabilitado ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                        </button>

                        <button
                            onClick={() => setModo('PIP')}
                            className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-800 transition cursor-pointer"
                            title="Expandir a ventana flotante"
                        >
                            <PictureInPicture2 className="w-3.5 h-3.5 text-emerald-400" />
                        </button>

                        <button
                            onClick={() => {
                                limpiarTimers();
                                onClose();
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                            title="Cerrar tutorial"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // =========================================================================
    // MODO 2: PANEL LATERAL ACOPLADO (Split Screen / Dock a la derecha)
    // =========================================================================
    if (modo === 'SIDEBAR') {
        return (
            <aside className="fixed top-0 right-0 h-[100dvh] w-full sm:w-[390px] md:w-[430px] z-50 bg-slate-950/98 backdrop-blur-2xl border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                {/* Cabecera Sidebar */}
                <div className="flex items-center justify-between px-3.5 py-3 bg-slate-950 border-b border-slate-800 shrink-0 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold shrink-0 shadow-md">
                            <Sparkles className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider block">Panel Tutor</span>
                            <h3 className="text-xs font-bold text-white truncate">Guía Paso a Paso</h3>
                        </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                        <button
                            onClick={() => setModo('PIP')}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
                            title="Modo flotante"
                        >
                            <PictureInPicture2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setModo('MODAL')}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
                            title="Modal grande"
                        >
                            <Maximize2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setModo('COMPACT')}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
                            title="Minimizar a barra"
                        >
                            <Minus className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => {
                                limpiarTimers();
                                onClose();
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                            title="Cerrar"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Banner de paso actual */}
                <div className="px-3.5 py-2 bg-emerald-950/30 border-b border-emerald-900/30 flex items-center justify-between gap-2 shrink-0">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold rounded-full border shadow-sm ${escena.colorBadge}`}>
                        {escena.icono}
                        <span>Paso {escena.id} de 8</span>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                        {reproduciendo ? '▶ Hablando...' : '⏸ En pausa'}
                    </span>
                </div>

                {/* Cuerpo con Scroll */}
                <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
                    {/* Visualización Animada */}
                    <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-3 flex flex-col items-center justify-center min-h-[150px] shadow-inner relative overflow-hidden">
                        <div className="absolute inset-0 bg-institutional-grid opacity-20 pointer-events-none" />
                        {renderVisualEscena(true)}
                    </div>

                    {/* Subtítulos en tiempo real */}
                    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 space-y-1">
                        <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${reproduciendo ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
                            <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">Locución en vivo</span>
                        </div>
                        <p className="text-xs text-slate-200 leading-relaxed italic">
                            "{escena.locucion}"
                        </p>
                    </div>

                    {/* Lo que debes hacer en tu pantalla */}
                    <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-3 space-y-2">
                        <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                            <HelpCircle className="w-3.5 h-3.5" />
                            <span>Instrucción para este paso</span>
                        </div>
                        <p className="text-xs text-slate-200 font-medium">
                            {escena.pasoAccion}
                        </p>
                        <ul className="text-[11px] text-slate-300 space-y-1 pt-1 border-t border-emerald-900/40">
                            {escena.puntosClave.map((punto, pIdx) => (
                                <li key={pIdx} className="flex items-start gap-1.5">
                                    <span className="text-emerald-400 font-bold">•</span>
                                    <span>{punto}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Selector rápido de todos los 8 pasos */}
                    <div className="space-y-1 pt-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-1">
                            Línea de Pasos
                        </span>
                        <div className="space-y-1">
                            {escenas.map((e, idx) => (
                                <button
                                    key={e.id}
                                    onClick={() => cambiarEscena(idx)}
                                    className={`w-full p-2 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                                        escenaActual === idx
                                            ? 'bg-emerald-950/50 border-emerald-500/60 text-white shadow-sm'
                                            : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className={`w-5 h-5 rounded-lg text-[10px] font-bold flex items-center justify-center ${
                                            escenaActual === idx ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                                        }`}>
                                            {e.id}
                                        </span>
                                        <span className="text-xs font-medium truncate">{e.titulo.split('. ')[1] || e.titulo}</span>
                                    </div>
                                    {escenaActual === idx && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Controles en el Footer */}
                <div className="p-3 bg-slate-950 border-t border-slate-800 shrink-0 space-y-2">
                    {/* Barra de Progreso */}
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-200"
                            style={{ width: `${progresoEscenaPct}%` }}
                        />
                    </div>

                    {/* Botones de Reproducción */}
                    <div className="flex items-center justify-between gap-1.5">
                        <button
                            onClick={() => cambiarEscena(Math.max(0, escenaActual - 1))}
                            disabled={escenaActual === 0}
                            className="p-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-slate-300 rounded-xl border border-slate-800 transition cursor-pointer"
                            title="Anterior"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>

                        <button
                            onClick={togglePlay}
                            className="flex-1 py-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950 transition cursor-pointer"
                        >
                            {reproduciendo ? <Pause className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                            <span>{reproduciendo ? 'Pausar' : 'Reproducir'}</span>
                        </button>

                        <button
                            onClick={() => cambiarEscena(Math.min(escenas.length - 1, escenaActual + 1))}
                            disabled={escenaActual === escenas.length - 1}
                            className="p-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-slate-300 rounded-xl border border-slate-800 transition cursor-pointer"
                            title="Siguiente"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>

                        <button
                            onClick={toggleAudio}
                            className={`p-2 rounded-xl border transition cursor-pointer ${
                                audioHabilitado ? 'bg-slate-900 border-slate-800 text-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-500'
                            }`}
                            title={audioHabilitado ? 'Silenciar voz' : 'Activar voz'}
                        >
                            {audioHabilitado ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </aside>
        );
    }

    // =========================================================================
    // MODO 3: PIP (MINI REPRODUCTOR FLOTANTE / PICTURE-IN-PICTURE NO BLOQUEANTE)
    // Permite al votante interactuar al 100% con la aplicación en paralelo
    // =========================================================================
    if (modo === 'PIP') {
        return (
            <div className="fixed inset-0 z-50 pointer-events-none flex flex-col justify-end items-end p-2 sm:p-4 md:p-6 overflow-hidden animate-fade-in">
                <div
                    ref={videoContainerRef}
                    className="pointer-events-auto w-full sm:w-[410px] md:w-[440px] max-h-[85vh] bg-slate-950/95 backdrop-blur-2xl border border-emerald-500/40 rounded-2xl sm:rounded-3xl shadow-2xl shadow-emerald-950/70 overflow-hidden flex flex-col transition-all duration-300 ring-1 ring-emerald-500/20"
                >
                    {/* 1. Header PiP Flotante */}
                    <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-slate-950 border-b border-slate-800 shrink-0 gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider truncate">
                                Tutorial en Paralelo
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                {escenaActual + 1}/8
                            </span>
                        </div>

                        {/* Controles de Ventana Flotante */}
                        <div className="flex items-center gap-1 shrink-0">
                            <button
                                onClick={() => setModo('SIDEBAR')}
                                className="p-1 sm:p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
                                title="Acoplar como panel lateral (Split screen)"
                            >
                                <Columns className="w-3.5 h-3.5" />
                            </button>

                            <button
                                onClick={() => setModo('COMPACT')}
                                className="p-1 sm:p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
                                title="Minimizar a píldora pequeña"
                            >
                                <Minus className="w-3.5 h-3.5" />
                            </button>

                            <button
                                onClick={() => setModo('MODAL')}
                                className="p-1 sm:p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
                                title="Maximizar a ventana grande"
                            >
                                <Maximize2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                                onClick={() => {
                                    limpiarTimers();
                                    onClose();
                                }}
                                className="p-1 sm:p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                                title="Cerrar tutorial"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* 2. Mini Escenario Visual Animado */}
                    <div className="relative bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-2.5 flex flex-col items-center justify-center min-h-[135px] max-h-[170px] overflow-hidden shrink-0 border-b border-slate-800/80">
                        <div className="absolute inset-0 bg-institutional-grid opacity-20 pointer-events-none" />
                        {renderVisualEscena(true)}
                    </div>

                    {/* 3. Subtítulo Dinámico & Guía de Acción Rápida */}
                    <div className="p-2.5 bg-slate-950 space-y-2 overflow-y-auto max-h-[180px]">
                        {/* Subtítulo de locución */}
                        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2 space-y-0.5">
                            <div className="flex items-center justify-between text-[9px] font-mono text-slate-400">
                                <span className="text-emerald-400 font-bold uppercase flex items-center gap-1">
                                    <span className={`w-1.5 h-1.5 rounded-full ${reproduciendo ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
                                    Locución
                                </span>
                                <span>{tiempoTranscurridoSeg}s</span>
                            </div>
                            <p className="text-[11px] text-slate-200 leading-tight">
                                "{escena.locucion}"
                            </p>
                        </div>

                        {/* Lo que debes hacer en tu pantalla */}
                        <div className="px-2 py-1.5 bg-emerald-950/30 border border-emerald-500/25 rounded-lg flex items-start gap-1.5">
                            <HelpCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <p className="text-[10px] text-emerald-200 leading-tight">
                                <strong className="text-white">Acción: </strong>{escena.pasoAccion}
                            </p>
                        </div>
                    </div>

                    {/* 4. Barra de Progreso */}
                    <div className="w-full bg-slate-950 px-3 pt-1 shrink-0">
                        <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 mb-0.5">
                            <span className="text-slate-300 font-semibold truncate">{escena.titulo}</span>
                            <span>{progresoTotalPct}%</span>
                        </div>
                        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500 transition-all duration-200"
                                style={{ width: `${progresoEscenaPct}%` }}
                            />
                        </div>
                    </div>

                    {/* 5. Controles de Reproducción PiP */}
                    <div className="p-2.5 sm:p-3 bg-slate-950 border-t border-slate-800/80 shrink-0 space-y-2">
                        {/* Stepper de 8 Pasos */}
                        <div className="flex items-center justify-between gap-1">
                            <button
                                onClick={() => cambiarEscena(Math.max(0, escenaActual - 1))}
                                disabled={escenaActual === 0}
                                className="p-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-slate-300 rounded-lg border border-slate-800 transition cursor-pointer"
                                title="Anterior"
                            >
                                <ChevronLeft className="w-3.5 h-3.5" />
                            </button>

                            <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                                {escenas.map((e, idx) => (
                                    <button
                                        key={e.id}
                                        onClick={() => cambiarEscena(idx)}
                                        className={`rounded-lg font-bold font-mono transition cursor-pointer flex items-center justify-center ${
                                            escenaActual === idx
                                                ? 'bg-emerald-500 text-slate-950 shadow-md w-5 h-5 sm:w-6 sm:h-6 text-[11px]'
                                                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800 w-5 h-5 sm:w-6 sm:h-6 text-[10px]'
                                        }`}
                                        title={e.titulo}
                                    >
                                        {e.id}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={() => cambiarEscena(Math.min(escenas.length - 1, escenaActual + 1))}
                                disabled={escenaActual === escenas.length - 1}
                                className="p-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-slate-300 rounded-lg border border-slate-800 transition cursor-pointer"
                                title="Siguiente"
                            >
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* Botones de Play / Reiniciar / Audio */}
                        <div className="flex items-center justify-between gap-1.5 pt-0.5">
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={reiniciar}
                                    className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 transition cursor-pointer"
                                    title="Reiniciar"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                </button>

                                <button
                                    onClick={toggleAudio}
                                    className={`p-1.5 rounded-lg border transition cursor-pointer ${
                                        audioHabilitado ? 'bg-slate-900 border-slate-800 text-emerald-400' : 'bg-slate-900 border-slate-800 text-slate-500'
                                    }`}
                                    title={audioHabilitado ? 'Silenciar voz' : 'Activar voz'}
                                >
                                    {audioHabilitado ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                                </button>
                            </div>

                            <button
                                onClick={togglePlay}
                                className="flex-1 max-w-[160px] py-1.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950 transition cursor-pointer"
                            >
                                {reproduciendo ? <Pause className="w-3.5 h-3.5 fill-white" /> : <Play className="w-3.5 h-3.5 fill-white" />}
                                <span>{reproduciendo ? 'Pausar' : 'Reproducir'}</span>
                            </button>

                            <button
                                onClick={() => {
                                    const nextRate = velocidadVoz === 0.95 ? 1.2 : velocidadVoz === 1.2 ? 0.85 : 0.95;
                                    setVelocidadVoz(nextRate);
                                    if (reproduciendo) reproducirEscenaActual(escenaActual);
                                }}
                                className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-[10px] font-mono font-bold text-emerald-400"
                                title="Cambiar velocidad"
                            >
                                {velocidadVoz}x
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // =========================================================================
    // MODO 4: MODAL COMPLETO (Centrado con fondo desenfocado y pestaña de guía)
    // =========================================================================
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in overflow-hidden">
            <div
                ref={videoContainerRef}
                className={`relative w-full max-w-5xl bg-slate-900 border-0 sm:border sm:border-slate-700/70 sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
                    pantallaCompleta
                        ? 'fixed inset-0 max-w-none rounded-none z-50 h-[100dvh]'
                        : 'h-[100dvh] sm:h-auto sm:my-4 sm:max-h-[92vh]'
                }`}
            >
                {/* 1. Header Superior Mobile-First */}
                <div className="flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3.5 bg-slate-950/95 border-b border-slate-800 shrink-0 gap-2 z-20">
                    {/* Título & Logo */}
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-emerald-950/50 shrink-0">
                            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-xs sm:text-base font-bold text-white flex items-center gap-1.5 truncate">
                                <span className="sm:hidden">Tutorial: Cómo Votar</span>
                                <span className="hidden sm:inline">Video Tutorial: Cómo Votar Paso a Paso</span>
                                <span className="hidden md:inline-block px-2 py-0.5 text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
                                    Fácil y Rápido
                                </span>
                            </h2>
                            <p className="text-[10px] sm:text-[11px] text-slate-400 truncate hidden xs:block">
                                Guía interactiva oficial con locución para votación transparente
                            </p>
                        </div>
                    </div>

                    {/* Acciones de Cabecera */}
                    <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                        {/* Selector de Pestañas Desktop */}
                        <div className="hidden md:flex bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                            <button
                                onClick={() => setPestanaVista('VIDEO')}
                                className={`px-3 py-1 text-xs font-semibold rounded-md transition flex items-center gap-1.5 ${
                                    pestanaVista === 'VIDEO' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                <Tv className="w-3.5 h-3.5" />
                                <span>Reproductor</span>
                            </button>
                            <button
                                onClick={() => setPestanaVista('GUIA_RAPIDA')}
                                className={`px-3 py-1 text-xs font-semibold rounded-md transition flex items-center gap-1.5 ${
                                    pestanaVista === 'GUIA_RAPIDA' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Guía Rápida</span>
                            </button>
                        </div>

                        {/* BOTÓN CLAVE: Modo Flotante / Seguir en Paralelo */}
                        <button
                            onClick={() => setModo('PIP')}
                            className="px-2.5 py-1.5 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg transition cursor-pointer text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-emerald-950"
                            title="Minimizar a la esquina para interactuar con la página en paralelo"
                        >
                            <PictureInPicture2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="hidden sm:inline">Seguir en Paralelo</span>
                            <span className="sm:hidden">Paralelo</span>
                        </button>

                        {/* Botón Panel Lateral Desktop */}
                        <button
                            onClick={() => setModo('SIDEBAR')}
                            className="hidden lg:flex p-1.5 sm:p-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-lg transition cursor-pointer text-xs items-center gap-1"
                            title="Acoplar como panel lateral (lado a lado)"
                        >
                            <Columns className="w-4 h-4" />
                            <span className="text-[11px]">Lateral</span>
                        </button>

                        {/* Botón Ajustes de Voz */}
                        <button
                            onClick={() => setMostrarAjustesVoz(!mostrarAjustesVoz)}
                            className={`p-1.5 sm:p-2 rounded-lg border transition cursor-pointer text-xs flex items-center gap-1 ${
                                mostrarAjustesVoz
                                    ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300'
                                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                            title="Ajustes de voz y velocidad"
                        >
                            <SlidersHorizontal className="w-4 h-4" />
                            <span className="hidden xl:inline text-[11px]">Voz</span>
                        </button>

                        {/* Pantalla Completa */}
                        <button
                            onClick={() => setPantallaCompleta(!pantallaCompleta)}
                            className="p-1.5 sm:p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
                            title={pantallaCompleta ? 'Salir de pantalla completa' : 'Pantalla completa'}
                        >
                            {pantallaCompleta ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                        </button>

                        {/* Cerrar */}
                        <button
                            onClick={() => {
                                limpiarTimers();
                                onClose();
                            }}
                            className="p-1.5 sm:p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                            title="Cerrar ventana"
                        >
                            <X className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                    </div>
                </div>

                {/* Banner de Invitación al Modo Paralelo */}
                <div className="bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-indigo-950/40 border-b border-emerald-500/20 px-3 sm:px-6 py-1.5 flex items-center justify-between text-[11px] text-emerald-300">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span><strong>¿Quieres ir votando mientras miras el tutorial?</strong> Puedes mover este reproductor a la esquina.</span>
                    </div>
                    <button
                        onClick={() => setModo('PIP')}
                        className="font-bold underline hover:text-white text-emerald-400 cursor-pointer ml-2 shrink-0"
                    >
                        Activar Modo Flotante →
                    </button>
                </div>

                {/* Sub-header Tabs Móvil */}
                <div className="flex md:hidden bg-slate-950/90 border-b border-slate-800/80 px-3 py-1.5 shrink-0">
                    <div className="grid grid-cols-2 w-full bg-slate-900 p-0.5 rounded-xl border border-slate-800 text-xs">
                        <button
                            onClick={() => setPestanaVista('VIDEO')}
                            className={`py-1.5 font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                                pestanaVista === 'VIDEO' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <Tv className="w-3.5 h-3.5" />
                            <span>Reproductor</span>
                        </button>
                        <button
                            onClick={() => setPestanaVista('GUIA_RAPIDA')}
                            className={`py-1.5 font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                                pestanaVista === 'GUIA_RAPIDA' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Guía Rápida</span>
                        </button>
                    </div>
                </div>

                {/* Drawer de Ajustes de Voz */}
                {mostrarAjustesVoz && (
                    <div className="bg-slate-950/95 border-b border-slate-800 px-3 sm:px-6 py-2.5 animate-fade-in shrink-0 z-20 flex flex-wrap items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                            <Mic className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="text-[11px] font-bold text-slate-300">Voz:</span>
                            <select
                                value={vozSeleccionadaURI}
                                onChange={(e) => {
                                    setVozSeleccionadaURI(e.target.value);
                                    if (reproduciendo) reproducirEscenaActual(escenaActual);
                                }}
                                className="bg-slate-900 border border-slate-700 text-xs text-emerald-300 rounded-lg px-2 py-1 focus:outline-none focus:border-emerald-500 cursor-pointer flex-1 max-w-xs truncate"
                            >
                                {vocesDisponibles.map((v) => (
                                    <option key={v.voiceURI} value={v.voiceURI} className="bg-slate-950 text-white">
                                        {v.name.includes('Natural') ? '✨ ' : ''}{v.name} ({v.lang})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <Gauge className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="text-[11px] font-bold text-slate-300">Velocidad:</span>
                            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                                {[0.85, 0.95, 1.05, 1.2].map((rate) => (
                                    <button
                                        key={rate}
                                        onClick={() => {
                                            setVelocidadVoz(rate);
                                            if (reproduciendo) reproducirEscenaActual(escenaActual);
                                        }}
                                        className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded transition cursor-pointer ${
                                            velocidadVoz === rate ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        {rate}x
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={() => setMostrarAjustesVoz(false)}
                            className="text-[10px] text-slate-400 hover:text-white ml-auto px-2 py-1 bg-slate-900 rounded border border-slate-800"
                        >
                            Listo ✓
                        </button>
                    </div>
                )}

                {/* 3. CONTENIDO: REPRODUCTOR O GUÍA RÁPIDA */}
                {pestanaVista === 'VIDEO' && (
                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                        {/* Escenario de Video */}
                        <div className="relative flex-1 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-3 sm:p-6 flex flex-col items-center justify-between overflow-y-auto min-h-0">
                            <div className="absolute inset-0 bg-institutional-grid opacity-20 pointer-events-none" />
                            <div className="absolute -top-24 -left-24 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                            <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                            {/* Badge de Escena Superior */}
                            <div className="z-10 mb-2 flex items-center justify-center gap-2 shrink-0">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] sm:text-xs font-semibold rounded-full border shadow-sm backdrop-blur ${escena.colorBadge}`}>
                                    {escena.icono}
                                    <span>Paso {escena.id} de {escenas.length}: {escena.titulo.split('. ')[1] || escena.titulo}</span>
                                </span>
                                <span className="text-[10px] sm:text-[11px] font-mono text-slate-400 bg-slate-950/80 px-2 py-1 rounded-full border border-slate-800 flex items-center gap-1">
                                    <span className={`w-1.5 h-1.5 rounded-full ${reproduciendo ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                                    <span>{tiempoTranscurridoSeg}s</span>
                                </span>
                            </div>

                            {/* Renderizador de Mockups */}
                            <div className="z-10 w-full max-w-3xl flex-1 flex flex-col items-center justify-center my-auto py-1">
                                {renderVisualEscena(false)}
                            </div>

                            {/* Subtítulo Dinámico Flotante de Locución */}
                            <div className="z-10 mt-2 w-full max-w-2xl bg-slate-950/95 border border-slate-800 rounded-xl p-2.5 sm:p-3 shadow-lg backdrop-blur shrink-0">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                    <div className="flex items-center gap-1.5">
                                        <span className={`w-2 h-2 rounded-full ${reproduciendo ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
                                        <span className="text-[9px] sm:text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                                            Locución en Vivo
                                        </span>
                                    </div>
                                    <span className="text-[9px] sm:text-[10px] font-mono text-slate-400">
                                        Paso {escena.id} de {escenas.length}
                                    </span>
                                </div>
                                <p className="text-xs sm:text-sm text-slate-200 leading-snug font-sans">
                                    "{escena.locucion}"
                                </p>
                            </div>
                        </div>

                        {/* Barra de Progreso */}
                        <div className="w-full bg-slate-950 px-3 sm:px-6 pt-2 shrink-0 border-t border-slate-800/80">
                            <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-mono text-slate-400 mb-1">
                                <span className="text-slate-300 font-semibold truncate max-w-[70%]">{escena.titulo}</span>
                                <span>{progresoTotalPct}% completado</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500 transition-all duration-200"
                                    style={{ width: `${progresoEscenaPct}%` }}
                                />
                            </div>
                        </div>

                        {/* Controles de Reproducción */}
                        <div className="px-3 sm:px-6 py-2.5 sm:py-3 bg-slate-950 border-t border-slate-800/80 shrink-0 space-y-2">
                            {/* Stepper */}
                            <div className="flex items-center justify-between gap-1.5">
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => cambiarEscena(Math.max(0, escenaActual - 1))}
                                        disabled={escenaActual === 0}
                                        className="p-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-slate-300 rounded-lg border border-slate-800 transition cursor-pointer"
                                        title="Paso anterior"
                                    >
                                        <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </button>
                                    <span className="text-[11px] font-mono text-slate-300 font-bold px-1 sm:hidden">
                                        {escenaActual + 1}/{escenas.length}
                                    </span>
                                </div>

                                <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-0.5">
                                    {escenas.map((e, idx) => (
                                        <button
                                            key={e.id}
                                            onClick={() => cambiarEscena(idx)}
                                            className={`rounded-lg font-bold font-mono transition cursor-pointer flex items-center justify-center ${
                                                escenaActual === idx
                                                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-950 w-6 h-6 sm:w-7 sm:h-7 text-xs'
                                                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800 w-5 h-5 sm:w-7 sm:h-7 text-[10px] sm:text-xs'
                                            }`}
                                            title={e.titulo}
                                        >
                                            <span className="sm:inline">{e.id}</span>
                                        </button>
                                    ))}
                                </div>

                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => cambiarEscena(Math.min(escenas.length - 1, escenaActual + 1))}
                                        disabled={escenaActual === escenas.length - 1}
                                        className="p-1.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-slate-300 rounded-lg border border-slate-800 transition cursor-pointer"
                                        title="Siguiente paso"
                                    >
                                        <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Botones Principales */}
                            <div className="flex items-center justify-between gap-2 pt-0.5">
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={reiniciar}
                                        className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 transition cursor-pointer"
                                        title="Reiniciar video"
                                    >
                                        <RotateCcw className="w-4 h-4" />
                                    </button>

                                    <button
                                        onClick={toggleAudio}
                                        className={`p-2 rounded-xl border transition cursor-pointer ${
                                            audioHabilitado
                                                ? 'bg-slate-900 border-slate-800 text-emerald-400'
                                                : 'bg-slate-900 border-slate-800 text-slate-500'
                                        }`}
                                        title={audioHabilitado ? 'Silenciar voz' : 'Activar voz'}
                                    >
                                        {audioHabilitado ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                                    </button>
                                </div>

                                <button
                                    onClick={togglePlay}
                                    className="flex-1 max-w-[200px] sm:max-w-[240px] py-2 sm:py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 transition active:scale-95 cursor-pointer"
                                >
                                    {reproduciendo ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
                                    <span>{reproduciendo ? 'Pausar' : 'Reproducir'}</span>
                                </button>

                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => setMostrarAjustesVoz(!mostrarAjustesVoz)}
                                        className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-[11px] font-mono font-bold text-emerald-400 flex items-center gap-1"
                                        title="Velocidad y Voz"
                                    >
                                        <Gauge className="w-3.5 h-3.5 text-slate-400" />
                                        <span>{velocidadVoz}x</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. PESTAÑA: GUÍA RÁPIDA RESUMIDA */}
                {pestanaVista === 'GUIA_RAPIDA' && (
                    <div className="flex-1 p-3 sm:p-6 overflow-y-auto space-y-3 sm:space-y-4">
                        <div className="border-b border-slate-800 pb-2.5">
                            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-emerald-400" />
                                Pasos para Votar en las Elecciones
                            </h3>
                            <p className="text-[11px] sm:text-xs text-slate-400">
                                Resumen paso a paso para consultar rápidamente mientras votas
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-4 pb-4">
                            {escenas.map((e) => (
                                <div
                                    key={e.id}
                                    onClick={() => {
                                        setEscenaActual(e.id - 1);
                                        setPestanaVista('VIDEO');
                                    }}
                                    className="p-3 sm:p-4 bg-slate-950/70 border border-slate-800 hover:border-emerald-500/40 rounded-xl sm:rounded-2xl cursor-pointer transition space-y-2 group active:scale-[0.99]"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 sm:p-2 rounded-xl bg-slate-900 border border-slate-800 group-hover:border-emerald-500/40">
                                                {e.icono}
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-bold text-white group-hover:text-emerald-400 transition">
                                                    {e.titulo}
                                                </h4>
                                                <span className="text-[10px] text-slate-400">{e.subtitulo}</span>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                            Ver ➔
                                        </span>
                                    </div>
                                    <ul className="text-[11px] text-slate-300 space-y-1 pl-1">
                                        {e.puntosClave.map((punto, pIdx) => (
                                            <li key={pIdx} className="flex items-start gap-1.5">
                                                <span className="text-emerald-400 font-bold">•</span>
                                                <span>{punto}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
