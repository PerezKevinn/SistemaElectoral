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
    Tv
} from 'lucide-react';

interface ModalVideoTutorialProps {
    isOpen: boolean;
    onClose: () => void;
}

interface EscenaTutorial {
    id: number;
    titulo: string;
    subtitulo: string;
    duracionEstimadaSegundos: number;
    icono: React.ReactNode;
    colorBadge: string;
    locucion: string;
    puntosClave: string[];
}

export const ModalVideoTutorial: React.FC<ModalVideoTutorialProps> = ({ isOpen, onClose }) => {
    const [escenaActual, setEscenaActual] = useState<number>(0);
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

    const escenas: EscenaTutorial[] = useMemo(() => [
        {
            id: 1,
            titulo: '1. Bienvenido a las Elecciones',
            subtitulo: 'Votación rápida, fácil y 100% secreta',
            duracionEstimadaSegundos: 13,
            icono: <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />,
            colorBadge: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
            locucion: 'Bienvenido al sistema de votación del sindicato. Aquí podrás votar de forma muy fácil, rápida y totalmente segura. Tu voto es privado y nadie sabrá por quién votaste.',
            puntosClave: [
                'Vota desde tu celular o computador',
                'Protegido con un código en tu teléfono',
                'Nadie sabrá por quién votaste: es 100% privado',
            ],
        },
        {
            id: 2,
            titulo: '2. ¿No estás en la lista? Regístrate aquí',
            subtitulo: 'Pide tu inscripción en menos de un minuto',
            duracionEstimadaSegundos: 15,
            icono: <UserPlus className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />,
            colorBadge: 'bg-blue-500/10 border-blue-500/30 text-blue-300',
            locucion: 'Si no apareces en la lista o necesitas actualizar tus datos, haz clic en "¿No figura en el censo?". Llena tus datos básicos: cédula, nombre, correo, sede y teléfono. Al enviar, recibirás un número de radicado para hacerle seguimiento.',
            puntosClave: [
                'Formulario sencillo con tus datos básicos',
                'Recibes tu número de radicado al instante',
                'El comité revisa y aprueba tu solicitud',
            ],
        },
        {
            id: 3,
            titulo: '3. Ingreso y Creación de tu Clave',
            subtitulo: 'Crea una clave personal que solo tú conozcas',
            duracionEstimadaSegundos: 14,
            icono: <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />,
            colorBadge: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
            locucion: 'Ingresa con tu número de cédula y la clave inicial que te entregaron. La primera vez que entres, el sistema te pedirá crear una clave nueva y personal de mínimo 6 letras o números. Así tu cuenta queda totalmente protegida.',
            puntosClave: [
                'Escribe tu cédula y clave inicial',
                'Crea tu clave nueva y personal',
                'Solo tú tendrás acceso a tu votación',
            ],
        },
        {
            id: 4,
            titulo: '4. Conectar con tu Celular',
            subtitulo: 'Escanea el código con Google Authenticator',
            duracionEstimadaSegundos: 16,
            icono: <Smartphone className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />,
            colorBadge: 'bg-purple-500/10 border-purple-500/30 text-purple-300',
            locucion: 'Para asegurar que nadie vote por ti, usaremos la aplicación Google Authenticator en tu celular. Descárgala gratis en tu teléfono, ábrela, toca el botón de más (+) y apunta la cámara al código en pantalla. Si no puedes escanearlo, también puedes escribir la clave manual.',
            puntosClave: [
                'Descarga gratis la app en tu celular',
                'Apunta la cámara para leer el código',
                'También puedes copiar la clave si no tienes cámara',
            ],
        },
        {
            id: 5,
            titulo: '5. Ingresa el Código de tu Celular',
            subtitulo: 'Escribe el número de 6 dígitos que aparece en la app',
            duracionEstimadaSegundos: 13,
            icono: <KeyRound className="w-4 h-4 sm:w-5 sm:h-5 text-teal-400" />,
            colorBadge: 'bg-teal-500/10 border-teal-500/30 text-teal-300',
            locucion: 'La aplicación en tu celular te mostrará un código de 6 números que cambia cada 30 segundos. Escribe ese código en la pantalla y presiona "Habilitar Voto". Con esto confirmamos que realmente eres tú.',
            puntosClave: [
                'Mira el código de 6 números en tu teléfono',
                'Escríbelo antes de que el círculo se llene',
                'Presiona "Habilitar Voto" para ingresar a la cabina',
            ],
        },
        {
            id: 6,
            titulo: '6. Tu Voto es 100% Secreto',
            subtitulo: 'Tu nombre y cédula no se guardan con tu voto',
            duracionEstimadaSegundos: 15,
            icono: <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />,
            colorBadge: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300',
            locucion: 'Aquí ocurre lo más importante: el sistema anota que ya participaste, pero entrega una papeleta digital totalmente anónima. Nadie puede saber por quién votaste, ni los directivos, ni los organizadores. Tu voto es completamente secreto.',
            puntosClave: [
                'El sistema registra que ya participaste',
                'Tu cédula queda separada de tu papeleta',
                'Nadie sabrá cuál fue tu elección',
            ],
        },
        {
            id: 7,
            titulo: '7. Elige tu Candidato y Vota',
            subtitulo: 'Marca tu preferencia y deposita tu voto',
            duracionEstimadaSegundos: 14,
            icono: <Vote className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />,
            colorBadge: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
            locucion: 'En la pantalla de votación verás a los candidatos y sus listas. Haz clic sobre el candidato de tu preferencia, presiona "Continuar", revisa que todo esté bien y haz clic en "Confirmar y Depositar". Tu voto quedará guardado en la urna virtual.',
            puntosClave: [
                'Mira las listas y candidatos disponibles',
                'Toca sobre el candidato que prefieras',
                'Confirma tu elección para depositar tu voto',
            ],
        },
        {
            id: 8,
            titulo: '8. ¡Listo! Guarda tu Comprobante',
            subtitulo: 'Tu voto fue registrado exitosamente',
            duracionEstimadaSegundos: 14,
            icono: <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />,
            colorBadge: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300',
            locucion: '¡Felicitaciones, ya votaste! La pantalla te mostrará un código de comprobante. Puedes copiarlo y guardarlo para comprobar que tu voto fue contado en el resultado final. ¡Gracias por participar!',
            puntosClave: [
                'Tu voto quedó guardado con éxito',
                'Recibes un código de comprobante',
                'Cierra la sesión de forma tranquila y segura',
            ],
        },
    ], []);

    // Cargar y ordenar voces en español, priorizando voces naturales
    const cargarVoces = useCallback(() => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

        const todasVoces = window.speechSynthesis.getVoices();
        if (!todasVoces || todasVoces.length === 0) return;

        // Filtrar y deduplicar voces en español
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

        // Ordenar priorizando las más naturales
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

        // Seleccionar la mejor voz por defecto si no hay una elegida
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

        // Si el audio está activado y SpeechSynthesis está disponible
        if (audioHabilitado && typeof window !== 'undefined' && 'speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(escena.locucion);
            utterance.lang = 'es-ES';
            utterance.rate = velocidadVoz;
            utterance.pitch = 1.0;

            // Asignar voz seleccionada
            if (vozSeleccionadaURI) {
                const voz = vocesDisponibles.find((v) => v.voiceURI === vozSeleccionadaURI);
                if (voz) {
                    utterance.voice = voz;
                }
            } else if (vocesDisponibles.length > 0) {
                utterance.voice = vocesDisponibles[0];
            }

            // Estimación de duración de locución para el progreso visual
            const palabras = escena.locucion.split(' ').length;
            const duracionEstimadaMs = Math.max(7000, (palabras / (2.6 * velocidadVoz)) * 1000);

            // Actualizador visual de progreso suave
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

            // EVENTO CLAVE: Solo avanza cuando la locución TERMINA COMPLETAMENTE
            utterance.onend = () => {
                if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
                setProgresoEscenaPct(100);

                // Pausa agradable de 1.4 segundos para apreciar la pantalla antes de la siguiente escena
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
            // Modo Silenciado: Avanza según el tiempo de lectura natural
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

    // Efecto principal al reproducir o cambiar de escena
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
                {/* 1. Header Superior Mobile-First (Sin Saltos de Línea) */}
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
                                Guía interactiva paso a paso para votación transparente
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

                        {/* Botón Ajustes de Voz (Móvil & Desktop) */}
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
                            <span className="hidden lg:inline text-[11px]">Ajustes</span>
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

                {/* 2. Sub-header Tabs Móvil (Control Segmentado Limpio) */}
                <div className="flex md:hidden bg-slate-950/90 border-b border-slate-800/80 px-3 py-1.5 shrink-0">
                    <div className="grid grid-cols-2 w-full bg-slate-900 p-0.5 rounded-xl border border-slate-800 text-xs">
                        <button
                            onClick={() => setPestanaVista('VIDEO')}
                            className={`py-1.5 font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                                pestanaVista === 'VIDEO'
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <Tv className="w-3.5 h-3.5" />
                            <span>Reproductor</span>
                        </button>
                        <button
                            onClick={() => setPestanaVista('GUIA_RAPIDA')}
                            className={`py-1.5 font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                                pestanaVista === 'GUIA_RAPIDA'
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Guía Rápida</span>
                        </button>
                    </div>
                </div>

                {/* Drawer/Popover Desplegable de Ajustes de Voz y Velocidad */}
                {mostrarAjustesVoz && (
                    <div className="bg-slate-950/95 border-b border-slate-800 px-3 sm:px-6 py-2.5 animate-fade-in shrink-0 z-20 flex flex-wrap items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                            <Mic className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <span className="text-[11px] font-bold text-slate-300">Voz:</span>
                            <select
                                value={vozSeleccionadaURI}
                                onChange={(e) => {
                                    setVozSeleccionadaURI(e.target.value);
                                    if (reproduciendo) {
                                        reproducirEscenaActual(escenaActual);
                                    }
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
                                            if (reproduciendo) {
                                                reproducirEscenaActual(escenaActual);
                                            }
                                        }}
                                        className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded transition cursor-pointer ${
                                            velocidadVoz === rate
                                                ? 'bg-emerald-600 text-white shadow'
                                                : 'text-slate-400 hover:text-white'
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

                {/* 3. CONTENIDO PRINCIPAL: REPRODUCTOR DE VIDEO O GUÍA */}
                {pestanaVista === 'VIDEO' && (
                    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                        {/* Escenario de Video (Área Visual Cinematográfica Optimizada) */}
                        <div className="relative flex-1 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-3 sm:p-6 flex flex-col items-center justify-between overflow-y-auto min-h-0">
                            {/* Fondo abstracto */}
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

                            {/* Renderizador de Mockups y Animaciones por Escena (Mobile Optimized) */}
                            <div className="z-10 w-full max-w-3xl flex-1 flex flex-col items-center justify-center my-auto py-1">
                                {/* ESCENA 1: BIENVENIDA */}
                                {escenaActual === 0 && (
                                    <div className="text-center space-y-3 sm:space-y-4 max-w-xl animate-fade-in w-full">
                                        <div className="w-14 h-14 sm:w-18 sm:h-18 mx-auto rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 shadow-xl shadow-emerald-950">
                                            <div className="w-full h-full bg-slate-950 rounded-2xl flex items-center justify-center text-emerald-400">
                                                <ShieldCheck className="w-7 h-7 sm:w-9 sm:h-9 animate-pulse" />
                                            </div>
                                        </div>
                                        <div>
                                            <h1 className="text-lg sm:text-2xl font-extrabold text-white tracking-tight">
                                                Elecciones Sindicales
                                            </h1>
                                            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-md mx-auto">
                                                Votación digital rápida, segura y transparente desde cualquier dispositivo.
                                            </p>
                                        </div>
                                        <div className="grid grid-cols-3 gap-1.5 sm:gap-3 pt-1">
                                            <div className="p-2 sm:p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
                                                <Smartphone className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 mx-auto mb-1" />
                                                <span className="text-[10px] sm:text-[11px] font-bold text-slate-200 block">En tu Celular</span>
                                                <span className="text-[9px] sm:text-[10px] text-slate-400">Código Seguro</span>
                                            </div>
                                            <div className="p-2 sm:p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
                                                <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400 mx-auto mb-1" />
                                                <span className="text-[10px] sm:text-[11px] font-bold text-slate-200 block">Voto Secreto</span>
                                                <span className="text-[9px] sm:text-[10px] text-slate-400">100% Anónimo</span>
                                            </div>
                                            <div className="p-2 sm:p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
                                                <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-teal-400 mx-auto mb-1" />
                                                <span className="text-[10px] sm:text-[11px] font-bold text-slate-200 block">Confiable</span>
                                                <span className="text-[9px] sm:text-[10px] text-slate-400">Urna Virtual</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ESCENA 2: REGISTRO / CENSO (Optimizado Compacto en Mobile) */}
                                {escenaActual === 1 && (
                                    <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-4 items-stretch animate-fade-in">
                                        <div className="bg-slate-950/90 border border-slate-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-left shadow-lg space-y-2">
                                            <div className="flex items-center gap-1.5 border-b border-slate-800 pb-1.5">
                                                <UserPlus className="w-3.5 h-3.5 text-blue-400" />
                                                <span className="text-[11px] sm:text-xs font-bold text-white uppercase tracking-wider">
                                                    Formulario de Censo
                                                </span>
                                            </div>
                                            <div className="space-y-1.5 text-xs">
                                                <div>
                                                    <span className="text-[9px] text-slate-400 block">Cédula:</span>
                                                    <div className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-200 font-mono text-[11px]">
                                                        1098765432
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className="text-[9px] text-slate-400 block">Nombre Completo:</span>
                                                    <div className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-200 text-[11px] truncate">
                                                        CARLOS ALBERTO MENDOZA
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-1.5">
                                                    <div>
                                                        <span className="text-[9px] text-slate-400 block">Sede:</span>
                                                        <div className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-200 text-[11px] truncate">
                                                            BOGOTÁ
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <span className="text-[9px] text-slate-400 block">Teléfono:</span>
                                                        <div className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-slate-200 font-mono text-[11px]">
                                                            3101234567
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-gradient-to-br from-blue-950/40 to-slate-950/80 border border-blue-500/30 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center space-y-2 flex flex-col justify-center">
                                            <div className="w-9 h-9 sm:w-11 sm:h-11 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center mx-auto">
                                                <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" />
                                            </div>
                                            <div>
                                                <h3 className="text-xs sm:text-sm font-bold text-white">Solicitud Enviada</h3>
                                                <p className="text-[10px] text-slate-400">Número oficial para seguimiento</p>
                                            </div>
                                            <div className="px-3 py-1.5 bg-slate-900/90 border border-blue-500/40 rounded-lg font-mono text-emerald-400 text-xs sm:text-sm font-bold tracking-wider">
                                                RAD-2026-9843
                                            </div>
                                            <p className="text-[10px] text-slate-400 leading-tight">
                                                El comité electoral revisará y validará tus datos.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* ESCENA 3: CAMBIO DE CONTRASEÑA */}
                                {escenaActual === 2 && (
                                    <div className="w-full max-w-md bg-slate-950/90 border border-slate-800 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-xl space-y-2.5 sm:space-y-3.5 text-left animate-fade-in">
                                        <div className="p-2 sm:p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg sm:rounded-xl flex items-start gap-2 sm:gap-2.5">
                                            <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                            <div>
                                                <h3 className="text-xs font-bold text-amber-300">Crea tu Nueva Clave Personal</h3>
                                                <p className="text-[10px] text-amber-200/80 mt-0.5">
                                                    Cambia la clave inicial por una clave segura que solo tú conozcas.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <div>
                                                <label className="text-[9px] font-bold text-slate-400 uppercase">Nueva Clave Personal</label>
                                                <div className="p-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-mono text-xs flex justify-between items-center">
                                                    <span>••••••••••••</span>
                                                    <span className="text-[10px] text-emerald-400 font-semibold">Clave Segura ✓</span>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-bold text-slate-400 uppercase">Repite tu Nueva Clave</label>
                                                <div className="p-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-100 font-mono text-xs flex justify-between items-center">
                                                    <span>••••••••••••</span>
                                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                                </div>
                                            </div>
                                            <div className="p-2 bg-amber-600 text-white text-center rounded-lg text-xs font-bold shadow-md shadow-amber-900/30">
                                                Guardar Clave y Continuar →
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* ESCENA 4: GOOGLE AUTHENTICATOR (Móvil Compacto) */}
                                {escenaActual === 3 && (
                                    <div className="w-full max-w-lg grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 items-center animate-fade-in">
                                        {/* Simulación QR */}
                                        <div className="bg-slate-950/90 border border-slate-800 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 text-center space-y-1.5">
                                            <div className="text-[10px] sm:text-xs font-bold text-slate-300 uppercase">
                                                1. Escanea el Código
                                            </div>
                                            <div className="p-2 bg-white rounded-lg inline-block shadow mx-auto">
                                                <div className="w-20 h-20 sm:w-28 sm:h-28 bg-slate-950 rounded flex flex-col items-center justify-center p-1 relative overflow-hidden">
                                                    <div className="grid grid-cols-5 gap-0.5 w-full h-full opacity-90">
                                                        {Array.from({ length: 25 }).map((_, i) => (
                                                            <div
                                                                key={i}
                                                                className={`rounded-xs ${
                                                                    i % 2 === 0 || i % 3 === 0 ? 'bg-white' : 'bg-slate-950'
                                                                }`}
                                                            />
                                                        ))}
                                                    </div>
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <div className="p-0.5 px-1 bg-emerald-500 text-slate-950 rounded font-bold text-[8px]">
                                                            APP
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-[9px] text-slate-400 font-mono bg-slate-900 p-1.5 rounded border border-slate-800 flex items-center justify-between">
                                                <span className="truncate">JBSWY3DPEHPK3PXP</span>
                                                <span className="text-[9px] text-emerald-400 font-sans font-bold">Manual</span>
                                            </div>
                                        </div>

                                        {/* Mockup Smartphone Authenticator */}
                                        <div className="w-full max-w-[200px] sm:max-w-[220px] mx-auto bg-slate-950 border-2 sm:border-4 border-slate-800 rounded-2xl sm:rounded-3xl p-2.5 sm:p-3 shadow-xl space-y-1.5">
                                            <div className="w-10 h-2.5 bg-slate-800 rounded-full mx-auto" />
                                            <div className="flex items-center gap-1.5 border-b border-slate-800 pb-1">
                                                <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-red-500 via-yellow-400 to-blue-500 flex items-center justify-center text-[8px] font-bold text-white">
                                                    G
                                                </div>
                                                <span className="text-[10px] font-bold text-white">Authenticator</span>
                                            </div>
                                            <div className="p-2 bg-slate-900 border border-slate-700/80 rounded-lg space-y-0.5 text-left">
                                                <span className="text-[8px] text-slate-400 block font-mono">Elecciones</span>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-base sm:text-lg font-bold font-mono text-blue-400 tracking-wider">
                                                        {totpAnimado.slice(0, 3)} {totpAnimado.slice(3)}
                                                    </span>
                                                    <div className="relative w-5 h-5 flex items-center justify-center">
                                                        <svg className="w-5 h-5 transform -rotate-90">
                                                            <circle
                                                                cx="10"
                                                                cy="10"
                                                                r="8"
                                                                stroke="#1e293b"
                                                                strokeWidth="2.5"
                                                                fill="transparent"
                                                            />
                                                            <circle
                                                                cx="10"
                                                                cy="10"
                                                                r="8"
                                                                stroke="#38bdf8"
                                                                strokeWidth="2.5"
                                                                fill="transparent"
                                                                strokeDasharray={50.2}
                                                                strokeDashoffset={50.2 - (50.2 * totpCountdown) / 30}
                                                                className="transition-all duration-1000 ease-linear"
                                                            />
                                                        </svg>
                                                        <span className="absolute text-[7px] font-mono text-slate-300">{totpCountdown}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <p className="text-[8px] text-emerald-400 text-center font-semibold">
                                                ✓ Código cada 30 segundos
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* ESCENA 5: VALIDACIÓN CÓDIGO TOTP */}
                                {escenaActual === 4 && (
                                    <div className="w-full max-w-md bg-slate-950/90 border border-slate-800 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-xl text-center space-y-3 animate-fade-in">
                                        <div className="w-10 h-10 bg-teal-500/10 border border-teal-500/30 text-teal-400 rounded-xl flex items-center justify-center mx-auto">
                                            <KeyRound className="w-5 h-5 animate-bounce" />
                                        </div>
                                        <div>
                                            <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                                                Escribe el Código de tu Celular
                                            </h3>
                                            <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">
                                                Ingresa los 6 números que muestra Google Authenticator
                                            </p>
                                        </div>

                                        {/* Casillas de Código Responsive */}
                                        <div className="flex justify-center gap-1.5 sm:gap-2 font-mono">
                                            {totpAnimado.split('').map((digito, idx) => (
                                                <div
                                                    key={idx}
                                                    className="w-8 h-10 sm:w-11 sm:h-13 bg-slate-900 border-2 border-emerald-500/80 rounded-lg sm:rounded-xl flex items-center justify-center text-base sm:text-xl font-bold text-emerald-400 shadow-md animate-pulse"
                                                >
                                                    {digito}
                                                </div>
                                            ))}
                                        </div>

                                        <div className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer">
                                            Habilitar Voto Seguro →
                                        </div>
                                    </div>
                                )}

                                {/* ESCENA 6: VOTO SECRETO */}
                                {escenaActual === 5 && (
                                    <div className="w-full max-w-xl bg-slate-950/90 border border-slate-800 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-xl text-center space-y-3 animate-fade-in">
                                        <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                                            Garantía de Voto Secreto y Privado
                                        </h3>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 items-center">
                                            <div className="p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-left">
                                                <div className="flex items-center gap-1 text-blue-400 font-bold text-[11px] mb-0.5">
                                                    <UserCheck className="w-3.5 h-3.5" />
                                                    <span>Censo Votantes</span>
                                                </div>
                                                <p className="text-[9px] text-slate-300">Cédula: 1098765432</p>
                                                <span className="inline-block mt-1 px-1.5 py-0.5 text-[8px] bg-emerald-500/20 text-emerald-300 rounded font-bold">
                                                    ✓ Ya Votó: SÍ
                                                </span>
                                            </div>

                                            <div className="flex sm:flex-col items-center justify-center gap-1 py-1">
                                                <div className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-full">
                                                    <Zap className="w-4 h-4" />
                                                </div>
                                                <span className="text-[9px] font-bold text-indigo-300 uppercase">
                                                    Separados
                                                </span>
                                            </div>

                                            <div className="p-2.5 bg-slate-900 border border-emerald-500/40 rounded-xl text-left">
                                                <div className="flex items-center gap-1 text-emerald-400 font-bold text-[11px] mb-0.5">
                                                    <Vote className="w-3.5 h-3.5" />
                                                    <span>Urna Digital</span>
                                                </div>
                                                <p className="text-[9px] text-slate-300 font-mono">Papeleta Anónima</p>
                                                <span className="inline-block mt-1 px-1.5 py-0.5 text-[8px] bg-indigo-500/20 text-indigo-300 rounded font-bold">
                                                    100% Confidencial
                                                </span>
                                            </div>
                                        </div>

                                        <p className="text-[10px] sm:text-xs text-slate-400 leading-relaxed">
                                            El sistema sabe que ya participaste, pero <strong className="text-white">nadie puede saber por quién votaste</strong>.
                                        </p>
                                    </div>
                                )}

                                {/* ESCENA 7: CABINA DE VOTACIÓN */}
                                {escenaActual === 6 && (
                                    <div className="w-full max-w-xl bg-slate-950/90 border border-slate-800 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-xl text-left space-y-2.5 animate-fade-in">
                                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                                            <div>
                                                <h3 className="text-xs font-bold text-white uppercase">Pantalla de Votación</h3>
                                                <p className="text-[10px] text-slate-400">Toca sobre el candidato que prefieras</p>
                                            </div>
                                            <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded text-[9px] font-mono">
                                                Papeleta Activa
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            <div className="p-2.5 rounded-xl border-2 border-emerald-500 bg-emerald-950/40 flex items-center justify-between shadow-md">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-7 h-7 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs flex items-center justify-center">
                                                        #1
                                                    </span>
                                                    <div>
                                                        <h4 className="text-xs font-bold text-white">LISTA 1 - UNIDAD</h4>
                                                        <span className="text-[9px] text-slate-400">Plancha Oficial</span>
                                                    </div>
                                                </div>
                                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                            </div>

                                            <div className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/60 opacity-60 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-7 h-7 rounded-lg bg-slate-800 text-slate-400 font-bold text-xs flex items-center justify-center">
                                                        #2
                                                    </span>
                                                    <div>
                                                        <h4 className="text-xs font-bold text-slate-300">LISTA 2 - CAMBIO</h4>
                                                        <span className="text-[9px] text-slate-500">Plancha Alternativa</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-2 bg-emerald-600 text-white text-center rounded-xl text-xs font-bold shadow-md">
                                            ✓ Confirmar y Depositar Mi Voto
                                        </div>
                                    </div>
                                )}

                                {/* ESCENA 8: COMPROBANTE */}
                                {escenaActual === 7 && (
                                    <div className="w-full max-w-md bg-slate-950/90 border border-slate-800 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 shadow-xl text-center space-y-2.5 animate-fade-in">
                                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl flex items-center justify-center mx-auto shadow-md">
                                            <ShieldCheck className="w-6 h-6 sm:w-7 sm:h-7" />
                                        </div>
                                        <div>
                                            <h3 className="text-xs sm:text-sm font-bold text-white">¡Voto Registrado con Éxito!</h3>
                                            <p className="text-[10px] text-slate-400">
                                                Tu participación fue guardada correctamente
                                            </p>
                                        </div>

                                        <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-left space-y-1">
                                            <span className="block text-[8px] font-bold text-slate-400 uppercase font-mono">
                                                Código de Comprobante
                                            </span>
                                            <code className="text-[10px] sm:text-xs text-emerald-400 font-mono break-all block p-1.5 bg-slate-950 rounded border border-slate-800">
                                                7f9c2d1b8e4f5a3c0d2e1b9a8f7c6e5d4b3a2c1e0f9a8b7c6d5e4f3a2b1c0d9e
                                            </code>
                                            <div className="flex items-center gap-1 text-[10px] text-slate-300">
                                                <Check className="w-3 h-3 text-emerald-400" />
                                                <span>Listo para revisar en el conteo oficial</span>
                                            </div>
                                        </div>

                                        <div className="p-2 bg-slate-800 text-slate-200 text-center rounded-xl text-xs font-bold border border-slate-700">
                                            Cerrar y Finalizar
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Subtítulo Dinámico Flotante de Locución (Compacto y Elegante) */}
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

                        {/* Barra de Progreso de la Escena & General */}
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

                        {/* 4. Controles de Reproducción Rediseñados Mobile-First */}
                        <div className="px-3 sm:px-6 py-2.5 sm:py-3 bg-slate-950 border-t border-slate-800/80 shrink-0 space-y-2">
                            {/* Fila 1: Stepper & Indicadores de Paso */}
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

                                {/* Puntos/Botones de Escena */}
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

                            {/* Fila 2: Botones Principales de Reproducción y Audio */}
                            <div className="flex items-center justify-between gap-2 pt-0.5">
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={reiniciar}
                                        className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800 transition cursor-pointer"
                                        title="Reiniciar video desde el principio"
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

                                {/* Botón Play / Pausa Prominente */}
                                <button
                                    onClick={togglePlay}
                                    className="flex-1 max-w-[200px] sm:max-w-[240px] py-2 sm:py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 transition active:scale-95 cursor-pointer"
                                >
                                    {reproduciendo ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
                                    <span>{reproduciendo ? 'Pausar' : 'Reproducir'}</span>
                                </button>

                                <div className="flex items-center gap-1.5">
                                    {/* Selector rápido de velocidad en desktop / botón de ajustes en móvil */}
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

                {/* 5. PESTAÑA: GUÍA RÁPIDA RESUMIDA */}
                {pestanaVista === 'GUIA_RAPIDA' && (
                    <div className="flex-1 p-3 sm:p-6 overflow-y-auto space-y-3 sm:space-y-4">
                        <div className="border-b border-slate-800 pb-2.5">
                            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-emerald-400" />
                                Pasos para Votar en las Elecciones
                            </h3>
                            <p className="text-[11px] sm:text-xs text-slate-400">
                                Resumen paso a paso para consultar rápidamente desde tu celular
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

