import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
    Users,
    UploadCloud,
    FileSpreadsheet,
    Download,
    Mail,
    ShieldCheck,
    CheckCircle2,
    XCircle,
    ArrowLeft,
    RefreshCw,
    Search,
    UserPlus,
    Lock,
    Send,
    Check,
    Sparkles,
    AlertTriangle,
    UserCheck,
    Trash2,
} from 'lucide-react';
import { useToast } from './Toast';

interface VotanteFilaPrevia {
    idTemporal: string;
    documento: string;
    nombreCompleto: string;
    correo: string;
    subdirectiva: string;
    telefono: string;
    esValido: boolean;
    errorMotivo?: string;
}

interface VotanteCenso {
    id_votante: string;
    documento_identidad: string;
    correo_institucional: string;
    nombres: string;
    apellidos: string;
    esta_habilitado: boolean;
    ha_solicitado_token: boolean;
    is_mfa_enabled: boolean;
    token_emitido_at?: string;
    creado_at: string;
}

interface PanelCensoVotantesProps {
    onVolver: () => void;
    onVerSolicitudes?: () => void;
}

export const PanelCensoVotantes: React.FC<PanelCensoVotantesProps> = ({ onVolver, onVerSolicitudes }) => {
    const toast = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [pestana, setPestana] = useState<'CARGA' | 'LISTA'>('CARGA');

    // Estados de Carga Masiva
    const [filasPrevias, setFilasPrevias] = useState<VotanteFilaPrevia[]>([]);
    const [archivoNombre, setArchivoNombre] = useState<string | null>(null);
    const [procesandoCarga, setProcesandoCarga] = useState(false);
    const [resultadoCarga, setResultadoCarga] = useState<{
        totalProcesados: number;
        exitosos: number;
        fallidos: number;
        correosEnviados: number;
        correosSimulados: number;
    } | null>(null);

    // Estados de Lista de Padrón
    const [votantes, setVotantes] = useState<VotanteCenso[]>([]);
    const [cargandoLista, setCargandoLista] = useState(false);
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState<'TODOS' | 'HABILITADOS' | 'INHABILITADOS' | 'VOTARON' | 'PENDIENTES'>('TODOS');

    // Modal Elector Individual
    const [modalIndividualAbierto, setModalIndividualAbierto] = useState(false);
    const [formIndividual, setFormIndividual] = useState({
        documento: '',
        nombreCompleto: '',
        correo: '',
        subdirectiva: '',
        telefono: '',
    });
    const [guardandoIndividual, setGuardandoIndividual] = useState(false);
    const [accionandoId, setAccionandoId] = useState<string | null>(null);

    // Modal y Estado de Eliminación de Votante
    const [votanteAEliminar, setVotanteAEliminar] = useState<VotanteCenso | null>(null);
    const [motivoEliminacion, setMotivoEliminacion] = useState('');
    const [eliminandoVotante, setEliminandoVotante] = useState(false);

    const getAuthHeaders = () => {
        const token = sessionStorage.getItem('staff_token');
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        };
    };

    // 1. Descargar Plantilla Oficial (.xlsx / .csv)
    const descargarPlantilla = (formato: 'xlsx' | 'csv') => {
        const headers = ['No. Identificación', 'Nombre Completo', 'Correo electrónico', 'Subdirectiva', 'Télefono'];
        const datosEjemplo = [
            ['1098765431', 'Andrés Felipe Vargas Silva', 'andres.vargas@sindicato.org', 'Bogotá - Central', '3101234567'],
            ['1098765432', 'María Camila Restrepo Peña', 'maria.restrepo@sindicato.org', 'Antioquia - Medellín', '3209876543'],
            ['1098765433', 'Carlos Eduardo Gómez Londoño', 'carlos.gomez@sindicato.org', 'Valle del Cauca - Cali', '3005558899'],
        ];

        const wsData = [headers, ...datosEjemplo];
        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Anchos de columna visuales
        ws['!cols'] = [
            { wch: 20 },
            { wch: 32 },
            { wch: 32 },
            { wch: 24 },
            { wch: 18 },
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Censo_Votantes');

        if (formato === 'xlsx') {
            XLSX.writeFile(wb, 'Plantilla_Censo_Votantes_Oficial.xlsx');
        } else {
            XLSX.writeFile(wb, 'Plantilla_Censo_Votantes_Oficial.csv', { bookType: 'csv' });
        }
        toast.info(`Plantilla ${formato.toUpperCase()} descargada.`);
    };

    // 2. Procesar Archivo Excel / CSV subido
    const procesarArchivo = (file: File) => {
        setArchivoNombre(file.name);
        setResultadoCarga(null);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const buffer = e.target?.result;
                const workbook = XLSX.read(buffer, { type: 'binary' });
                const primeraHojaNombre = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[primeraHojaNombre];

                // Convertir a JSON
                const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

                if (jsonData.length === 0) {
                    toast.error('El archivo cargado no contiene registros o está vacío.', 'Archivo Vacío');
                    setFilasPrevias([]);
                    return;
                }

                const docsUnicos = new Set<string>();
                const parsed: VotanteFilaPrevia[] = [];

                jsonData.forEach((row, idx) => {
                    // Mapeo flexible de columnas
                    const docRaw = row['No. Identificación'] || row['No Identificacion'] || row['Identificación'] || row['Identificacion'] || row['Documento'] || row['Cedula'] || row['Cédula'] || row['documento'] || '';
                    const nombreRaw = row['Nombre Completo'] || row['Nombre completo'] || row['Nombres y Apellidos'] || row['Nombre'] || row['Nombres'] || '';
                    const correoRaw = row['Correo electrónico'] || row['Correo electronico'] || row['Correo'] || row['Email'] || row['correo'] || '';
                    const subdirectivaRaw = row['Subdirectiva'] || row['Seccional'] || row['Sede'] || row['subdirectiva'] || 'General';
                    const telefonoRaw = row['Télefono'] || row['Telefono'] || row['Celular'] || row['Movil'] || row['telefono'] || '';

                    const documento = String(docRaw).trim();
                    const nombreCompleto = String(nombreRaw).trim();
                    const correo = String(correoRaw).trim().toLowerCase();
                    const subdirectiva = String(subdirectivaRaw).trim();
                    const telefono = String(telefonoRaw).trim();

                    // Validaciones en cliente
                    let esValido = true;
                    let errorMotivo = '';

                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

                    if (!documento) {
                        esValido = false;
                        errorMotivo = 'Falta No. de Identificación';
                    } else if (docsUnicos.has(documento)) {
                        esValido = false;
                        errorMotivo = 'Cédula duplicada en el archivo';
                    } else if (!nombreCompleto) {
                        esValido = false;
                        errorMotivo = 'Falta Nombre Completo';
                    } else if (!correo || !emailRegex.test(correo)) {
                        esValido = false;
                        errorMotivo = 'Correo electrónico inválido o ausente';
                    }

                    if (documento) docsUnicos.add(documento);

                    parsed.push({
                        idTemporal: `row-${idx + 1}`,
                        documento,
                        nombreCompleto,
                        correo,
                        subdirectiva: subdirectiva || 'General',
                        telefono,
                        esValido,
                        errorMotivo: errorMotivo || undefined,
                    });
                });

                setFilasPrevias(parsed);
                const validosCount = parsed.filter((r) => r.esValido).length;
                toast.success(`${parsed.length} filas analizadas (${validosCount} listas para despachar).`, 'Excel Procesado');
            } catch (err: any) {
                console.error('Error parseando excel:', err);
                toast.error('No se pudo leer el archivo Excel. Asegúrate de usar un formato .xlsx, .xls o .csv válido.', 'Error de Lectura');
            }
        };

        reader.readAsBinaryString(file);
    };

    // 3. Ejecutar Carga Masiva y Notificación
    const ejecutarCargaMasiva = async () => {
        const validas = filasPrevias.filter((r) => r.esValido);
        if (validas.length === 0) {
            toast.warning('No hay registros válidos en la tabla para procesar.');
            return;
        }

        setProcesandoCarga(true);
        try {
            const payload = {
                votantes: validas.map((r) => ({
                    documento: r.documento,
                    nombreCompleto: r.nombreCompleto,
                    correo: r.correo,
                    subdirectiva: r.subdirectiva,
                    telefono: r.telefono,
                })),
            };

            const res = await fetch('/api/censo/cargar-masivo', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Error al procesar la carga en el servidor');
            }

            setResultadoCarga(data.resumen);
            if (data.resumen.correosSimulados > 0 && data.resumen.correosEnviados === 0) {
                toast.warning(
                    `Se procesaron ${data.resumen.exitosos} electores en BD (Modo Simulación: revisa server/.env para envíos reales).`,
                    'Censo Actualizado (Simulación)'
                );
            } else {
                toast.success(
                    `Se registraron ${data.resumen.exitosos} electores y se despacharon sus contraseñas por correo.`,
                    'Censo Oficial Actualizado'
                );
            }
            setFilasPrevias([]);
            setArchivoNombre(null);
            cargarListaVotantes();
        } catch (err: any) {
            toast.error(err.message, 'Fallo en Carga Masiva');
        } finally {
            setProcesandoCarga(false);
        }
    };

    // 4. Cargar Lista de Votantes del Censo
    const cargarListaVotantes = async () => {
        setCargandoLista(true);
        try {
            let url = `/api/censo/votantes?limit=200`;
            if (filtroEstado !== 'TODOS') url += `&estado=${filtroEstado}`;
            if (busqueda.trim()) url += `&busqueda=${encodeURIComponent(busqueda.trim())}`;

            const res = await fetch(url, { headers: getAuthHeaders() });
            const data = await res.json();

            if (res.ok && data.success) {
                setVotantes(data.votantes || []);
            } else {
                throw new Error(data.error || 'Error al obtener votantes');
            }
        } catch (err: any) {
            console.error(err);
            toast.error(err.message, 'Error al Cargar Padrón');
        } finally {
            setCargandoLista(false);
        }
    };

    useEffect(() => {
        if (pestana === 'LISTA') {
            cargarListaVotantes();
        }
    }, [pestana, filtroEstado]);

    // 5. Reenviar Credenciales a un Elector
    const handleReenviarCredencial = async (idVotante: string, documento: string, correo: string) => {
        setAccionandoId(idVotante);
        try {
            const res = await fetch('/api/censo/reenviar-credencial', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ idVotante, documento }),
            });
            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Error al reenviar credenciales');
            }

            if (data.email?.simulado) {
                toast.warning(`Clave regenerada en BD para ${correo} (Modo Simulación: revisa server/.env para envíos reales)`, 'Clave Regenerada');
            } else {
                toast.success(`Nuevas credenciales generadas y enviadas a ${correo}`, 'Credenciales Despachadas');
            }
        } catch (err: any) {
            toast.error(err.message, 'Error al Reenviar');
        } finally {
            setAccionandoId(null);
        }
    };

    // 6. Cambiar Estado de Habilitación
    const handleToggleHabilitado = async (votante: VotanteCenso) => {
        setAccionandoId(votante.id_votante);
        try {
            const nuevoEstado = !votante.esta_habilitado;
            const res = await fetch('/api/censo/estado', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    idVotante: votante.id_votante,
                    habilitado: nuevoEstado,
                }),
            });
            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Error al modificar estado');
            }

            toast.success(
                `Elector ${nuevoEstado ? 'habilitado' : 'inhabilitado'} en el censo.`,
                'Padrón Actualizado'
            );
            cargarListaVotantes();
        } catch (err: any) {
            toast.error(err.message, 'Error al Cambiar Estado');
        } finally {
            setAccionandoId(null);
        }
    };

    // 7. Eliminar Elector del Censo con registro en bitácora
    const handleConfirmarEliminacionVotante = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!votanteAEliminar) return;

        setEliminandoVotante(true);
        try {
            const res = await fetch('/api/censo/eliminar', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    idVotante: votanteAEliminar.id_votante,
                    motivo: motivoEliminacion.trim(),
                }),
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Error al eliminar elector del censo');
            }

            toast.success(
                `Elector ${votanteAEliminar.nombres} ${votanteAEliminar.apellidos} eliminado del censo electoral.`,
                'Elector Eliminado de Censo'
            );
            setVotanteAEliminar(null);
            cargarListaVotantes();
        } catch (err: any) {
            toast.error(err.message, 'Fallo al Eliminar Elector');
        } finally {
            setEliminandoVotante(false);
        }
    };

    // 8. Guardar Elector Individual
    const handleGuardarIndividual = async (e: React.FormEvent) => {
        e.preventDefault();
        setGuardandoIndividual(true);
        try {
            const res = await fetch('/api/censo/crear', {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify(formIndividual),
            });
            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Error al registrar elector');
            }

            toast.success(
                `Elector registrado con éxito. Credenciales enviadas a ${formIndividual.correo}`,
                'Votante Agregado'
            );
            setModalIndividualAbierto(false);
            setFormIndividual({ documento: '', nombreCompleto: '', correo: '', subdirectiva: '', telefono: '' });
            cargarListaVotantes();
        } catch (err: any) {
            toast.error(err.message, 'Error de Registro');
        } finally {
            setGuardandoIndividual(false);
        }
    };

    const filasValidasCount = filasPrevias.filter((f) => f.esValido).length;
    const filasInvalidasCount = filasPrevias.length - filasValidasCount;

    return (
        <div className="w-full max-w-6xl mx-auto glass-panel p-4 sm:p-6 lg:p-8 rounded-2xl shadow-2xl space-y-6 animate-in fade-in duration-300">
            {/* Header del Panel */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800/80 pb-5 gap-4">
                <div className="flex items-center space-x-3">
                    <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400 shadow-md shadow-indigo-950/40">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                                Censo Electoral y Notificación Segura
                            </h2>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800/60 flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-emerald-400" />
                                Zero-Knowledge
                            </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                            Carga masiva vía Excel (.xlsx / .csv), generación criptográfica y despacho privado de credenciales
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {onVerSolicitudes && (
                        <button
                            onClick={onVerSolicitudes}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border border-indigo-500/40 rounded-xl text-xs font-semibold transition cursor-pointer shadow-sm"
                        >
                            <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Solicitudes de Registro</span>
                        </button>
                    )}
                    <button
                        onClick={onVolver}
                        className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-semibold transition cursor-pointer"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Volver al Panel</span>
                    </button>
                </div>
            </div>

            {/* Selector de Pestañas */}
            <div className="flex border-b border-slate-800/80 gap-2">
                <button
                    onClick={() => setPestana('CARGA')}
                    className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${pestana === 'CARGA'
                        ? 'border-indigo-500 text-indigo-300 bg-indigo-950/20 rounded-t-xl'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                >
                    <UploadCloud className="w-4 h-4" />
                    <span>Carga Masiva (Excel / CSV)</span>
                </button>
                <button
                    onClick={() => setPestana('LISTA')}
                    className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${pestana === 'LISTA'
                        ? 'border-indigo-500 text-indigo-300 bg-indigo-950/20 rounded-t-xl'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                        }`}
                >
                    <Users className="w-4 h-4" />
                    <span>Padrón Electoral Activo</span>
                </button>
            </div>

            {/* PESTAÑA 1: CARGA MASIVA */}
            {pestana === 'CARGA' && (
                <div className="space-y-6">
                    {/* Tarjeta de Seguridad Zero-Knowledge */}
                    <div className="p-4 bg-slate-900/60 border border-indigo-900/40 rounded-xl flex items-start space-x-3 text-xs text-slate-300">
                        <ShieldCheck className="w-5 h-5 flex-shrink-0 text-indigo-400 mt-0.5" />
                        <div className="space-y-1">
                            <strong className="text-indigo-200 font-semibold block">
                                Protocolo de Privacidad y Cero Conocimiento (Zero-Knowledge):
                            </strong>
                            <p className="text-slate-400 leading-relaxed text-[11px]">
                                Las contraseñas temporales se generan aleatoriamente con alta entropía criptográfica y se envían de forma directa y cifrada al correo electrónico institucional del elector. <strong>Ningún miembro del personal administrativo tiene acceso a ver o almacenar estas contraseñas en texto plano.</strong>
                            </p>
                        </div>
                    </div>

                    {/* Barra de Acciones y Descarga de Plantilla */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-950/80 border border-slate-800/80 rounded-xl">
                        <div>
                            <span className="text-xs font-bold text-white block">Plantilla Oficial de Importación</span>
                            <span className="text-[11px] text-slate-400">
                                Columnas: <code>No. Identificación</code>, <code>Nombre Completo</code>, <code>Correo electrónico</code>, <code>Subdirectiva</code>, <code>Télefono</code>
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => descargarPlantilla('xlsx')}
                                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/60 text-xs font-semibold rounded-xl transition cursor-pointer shadow-sm"
                            >
                                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                                <span>Plantilla Excel (.xlsx)</span>
                            </button>
                            <button
                                onClick={() => descargarPlantilla('csv')}
                                className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold rounded-xl transition cursor-pointer"
                            >
                                <Download className="w-3.5 h-3.5 text-slate-400" />
                                <span>Plantilla (.csv)</span>
                            </button>
                        </div>
                    </div>

                    {/* Zona de Carga Drag & Drop */}
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                            e.preventDefault();
                            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                procesarArchivo(e.dataTransfer.files[0]);
                            }
                        }}
                        className="border-2 border-dashed border-slate-700/80 hover:border-indigo-500/60 hover:bg-indigo-950/10 bg-slate-950/50 rounded-2xl p-8 text-center cursor-pointer transition space-y-3"
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx, .xls, .csv"
                            className="hidden"
                            onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                    procesarArchivo(e.target.files[0]);
                                }
                            }}
                        />
                        <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
                            <UploadCloud className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white">
                                {archivoNombre ? archivoNombre : 'Haz clic o arrastra tu archivo Excel aquí'}
                            </h3>
                            <p className="text-xs text-slate-400 mt-1">
                                Formatos soportados: <strong>.xlsx, .xls, .csv</strong> (hasta 5,000 registros por lote)
                            </p>
                        </div>
                    </div>

                    {/* Resumen de Última Carga si existe */}
                    {resultadoCarga && (
                        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl space-y-3 animate-in fade-in duration-200">
                            <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                <span>Resumen del Proceso de Importación</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                                    <span className="text-slate-400 block text-[10px]">Total Procesados</span>
                                    <span className="text-white font-bold font-mono text-sm">{resultadoCarga.totalProcesados}</span>
                                </div>
                                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                                    <span className="text-emerald-400 block text-[10px]">Votantes Habilitados</span>
                                    <span className="text-emerald-300 font-bold font-mono text-sm">{resultadoCarga.exitosos}</span>
                                </div>
                                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                                    <span className="text-indigo-400 block text-[10px]">Correos Reales Despachados</span>
                                    <span className="text-indigo-300 font-bold font-mono text-sm">
                                        {resultadoCarga.correosEnviados}
                                    </span>
                                </div>
                                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                                    <span className="text-amber-400 block text-[10px]">Correos Modo Simulado</span>
                                    <span className="text-amber-300 font-bold font-mono text-sm">{resultadoCarga.correosSimulados}</span>
                                </div>
                            </div>
                            {resultadoCarga.correosSimulados > 0 && (
                                <div className="p-3 bg-amber-950/40 border border-amber-800/50 rounded-lg text-xs text-amber-300/90 leading-relaxed flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                    <div>
                                        <strong>Atención:</strong> Las credenciales de {resultadoCarga.correosSimulados} votantes se registraron de forma segura en la base de datos, pero se procesaron en <strong>Modo Simulación</strong> porque el servidor SMTP no está configurado en <code className="bg-amber-900/60 px-1 py-0.5 rounded font-mono">server/.env</code>. Para que los correos salgan a las bandejas reales, configura las variables SMTP en el archivo <code>.env</code>.
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Previsualización de Datos Parseados */}
                    {filasPrevias.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                                        Previsualización de Datos ({filasPrevias.length} registros)
                                    </h3>
                                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/60">
                                        {filasValidasCount} Válidos
                                    </span>
                                    {filasInvalidasCount > 0 && (
                                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-950 text-rose-300 border border-rose-800/60">
                                            {filasInvalidasCount} Con Inconsistencias
                                        </span>
                                    )}
                                </div>

                                <button
                                    onClick={ejecutarCargaMasiva}
                                    disabled={procesandoCarga || filasValidasCount === 0}
                                    className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition cursor-pointer disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-indigo-950/60"
                                >
                                    {procesandoCarga ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            <span>Cifrando y Despachando Credenciales...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4" />
                                            <span>Procesar Censo y Enviar Credenciales ({filasValidasCount})</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/70 max-h-80">
                                <table className="w-full text-left text-xs text-slate-300 font-sans">
                                    <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] font-mono sticky top-0 border-b border-slate-800">
                                        <tr>
                                            <th className="px-3.5 py-2.5">Estado</th>
                                            <th className="px-3.5 py-2.5">No. Identificación</th>
                                            <th className="px-3.5 py-2.5">Nombre Completo</th>
                                            <th className="px-3.5 py-2.5">Correo Electrónico</th>
                                            <th className="px-3.5 py-2.5">Subdirectiva</th>
                                            <th className="px-3.5 py-2.5">Teléfono</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/60 text-xs">
                                        {filasPrevias.map((fila) => (
                                            <tr key={fila.idTemporal} className={`hover:bg-slate-900/40 transition ${!fila.esValido ? 'bg-rose-950/20' : ''}`}>
                                                <td className="px-3.5 py-2 whitespace-nowrap">
                                                    {fila.esValido ? (
                                                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/40">
                                                            <Check className="w-3 h-3" /> Listo
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 text-[10px] text-rose-400 font-semibold bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-800/40" title={fila.errorMotivo}>
                                                            <XCircle className="w-3 h-3" /> {fila.errorMotivo}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-3.5 py-2 font-mono font-semibold text-white">{fila.documento}</td>
                                                <td className="px-3.5 py-2 text-slate-200">{fila.nombreCompleto}</td>
                                                <td className="px-3.5 py-2 font-mono text-slate-400">{fila.correo}</td>
                                                <td className="px-3.5 py-2 text-slate-300">{fila.subdirectiva}</td>
                                                <td className="px-3.5 py-2 font-mono text-slate-400">{fila.telefono || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* PESTAÑA 2: LISTA DE PADRÓN ELECTORAL */}
            {pestana === 'LISTA' && (
                <div className="space-y-4">
                    {/* Barra de Búsqueda y Filtros */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
                        <div className="flex-1 relative">
                            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                            <input
                                type="text"
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && cargarListaVotantes()}
                                placeholder="Buscar por cédula, nombre o correo..."
                                className="w-full pl-9 pr-4 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <select
                                value={filtroEstado}
                                onChange={(e) => setFiltroEstado(e.target.value as any)}
                                className="px-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-200 outline-none focus:border-indigo-500 cursor-pointer"
                            >
                                <option value="TODOS">Todos los Estados</option>
                                <option value="HABILITADOS">Habilitados para Votar</option>
                                <option value="INHABILITADOS">Inhabilitados</option>
                                <option value="VOTARON">Voto Emitido</option>
                                <option value="PENDIENTES">Pendientes de Votar</option>
                            </select>

                            <button
                                onClick={cargarListaVotantes}
                                disabled={cargandoLista}
                                className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700/80 rounded-lg transition cursor-pointer"
                                title="Recargar lista"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${cargandoLista ? 'animate-spin' : ''}`} />
                            </button>

                            <button
                                onClick={() => setModalIndividualAbierto(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer shadow-sm"
                            >
                                <UserPlus className="w-3.5 h-3.5" />
                                <span>Nuevo Elector</span>
                            </button>
                        </div>
                    </div>

                    {/* Tabla de Votantes */}
                    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/70">
                        <table className="w-full text-left text-xs text-slate-300 font-sans">
                            <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] font-mono border-b border-slate-800">
                                <tr>
                                    <th className="px-4 py-3">Documento</th>
                                    <th className="px-4 py-3">Elector</th>
                                    <th className="px-4 py-3">Correo Institucional</th>
                                    <th className="px-4 py-3">Habilitación</th>
                                    <th className="px-4 py-3">Estado Sufragio</th>
                                    <th className="px-4 py-3 text-right">Acciones de Custodia</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60 text-xs">
                                {cargandoLista ? (
                                    <tr>
                                        <td colSpan={6} className="py-8 text-center text-slate-500">
                                            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-400" />
                                            Cargando padrón electoral...
                                        </td>
                                    </tr>
                                ) : votantes.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-8 text-center text-slate-500">
                                            No se encontraron electores con los filtros seleccionados.
                                        </td>
                                    </tr>
                                ) : (
                                    votantes.map((v) => (
                                        <tr key={v.id_votante} className="hover:bg-slate-900/40 transition">
                                            <td className="px-4 py-3 font-mono font-bold text-white">
                                                {v.documento_identidad}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="font-semibold text-slate-200 block">
                                                    {v.nombres} {v.apellidos}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-mono text-slate-400">
                                                {v.correo_institucional}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${v.esta_habilitado
                                                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                                                        : 'bg-rose-950 text-rose-300 border border-rose-800/60'
                                                        }`}
                                                >
                                                    {v.esta_habilitado ? 'Habilitado' : 'Inhabilitado'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {v.ha_solicitado_token ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-cyan-950 text-cyan-300 border border-cyan-800/60">
                                                        <CheckCircle2 className="w-3 h-3 text-cyan-400" /> Voto Ejercido
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-800">
                                                        Pendiente
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={() => handleReenviarCredencial(v.id_votante, v.documento_identidad, v.correo_institucional)}
                                                        disabled={accionandoId === v.id_votante || v.ha_solicitado_token}
                                                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-300 hover:text-indigo-300 border border-slate-800 rounded-lg text-[11px] font-semibold transition cursor-pointer disabled:cursor-not-allowed flex items-center gap-1"
                                                        title={v.ha_solicitado_token ? 'El elector ya votó, no se pueden reenviar credenciales' : 'Regenera la clave y la envía directamente a su correo'}
                                                    >
                                                        <Mail className="w-3 h-3" />
                                                        <span>Reenviar Clave</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleHabilitado(v)}
                                                        disabled={accionandoId === v.id_votante}
                                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition cursor-pointer border ${v.esta_habilitado
                                                            ? 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border-rose-900/60'
                                                            : 'bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border-emerald-900/60'
                                                            }`}
                                                    >
                                                        {v.esta_habilitado ? 'Inhabilitar' : 'Habilitar'}
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setVotanteAEliminar(v);
                                                            setMotivoEliminacion('Desvinculación del censo electoral oficial por resolución administrativa');
                                                        }}
                                                        disabled={accionandoId === v.id_votante}
                                                        className="p-1.5 bg-slate-900 hover:bg-rose-950/70 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-800/80 rounded-lg text-xs transition cursor-pointer"
                                                        title="Eliminar elector del censo (con registro auditado)"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* MODAL REGISTRO INDIVIDUAL DE ELECTOR */}
            {modalIndividualAbierto && (
                <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="max-w-md w-full glass-panel border border-slate-700/80 rounded-2xl p-6 space-y-4 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                                <UserPlus className="w-5 h-5 text-indigo-400" />
                                <h3 className="text-sm font-bold text-white">Registrar Elector Individual</h3>
                            </div>
                            <button
                                onClick={() => setModalIndividualAbierto(false)}
                                className="text-slate-400 hover:text-white transition"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleGuardarIndividual} className="space-y-3.5 text-xs">
                            <div>
                                <label className="block text-slate-300 font-semibold mb-1">No. Identificación / Cédula *</label>
                                <input
                                    type="text"
                                    required
                                    value={formIndividual.documento}
                                    onChange={(e) => setFormIndividual({ ...formIndividual, documento: e.target.value })}
                                    placeholder="Ej: 1098765432"
                                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg text-white font-mono outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-slate-300 font-semibold mb-1">Nombre Completo *</label>
                                <input
                                    type="text"
                                    required
                                    value={formIndividual.nombreCompleto}
                                    onChange={(e) => setFormIndividual({ ...formIndividual, nombreCompleto: e.target.value })}
                                    placeholder="Ej: María Camila Restrepo Peña"
                                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg text-white outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-slate-300 font-semibold mb-1">Correo Electrónico *</label>
                                <input
                                    type="email"
                                    required
                                    value={formIndividual.correo}
                                    onChange={(e) => setFormIndividual({ ...formIndividual, correo: e.target.value })}
                                    placeholder="maria.restrepo@sindicato.org"
                                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg text-white font-mono outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                <div>
                                    <label className="block text-slate-300 font-semibold mb-1">Subdirectiva</label>
                                    <input
                                        type="text"
                                        value={formIndividual.subdirectiva}
                                        onChange={(e) => setFormIndividual({ ...formIndividual, subdirectiva: e.target.value })}
                                        placeholder="Ej: Bogotá Central"
                                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg text-white outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-slate-300 font-semibold mb-1">Teléfono</label>
                                    <input
                                        type="text"
                                        value={formIndividual.telefono}
                                        onChange={(e) => setFormIndividual({ ...formIndividual, telefono: e.target.value })}
                                        placeholder="Ej: 3101234567"
                                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-lg text-white font-mono outline-none"
                                    />
                                </div>
                            </div>

                            <div className="p-3 bg-indigo-950/30 border border-indigo-900/50 rounded-xl text-[11px] text-indigo-300">
                                <Lock className="w-3.5 h-3.5 inline mr-1 text-indigo-400" />
                                La contraseña se generará automáticamente y se enviará de forma cifrada al correo proporcionado.
                            </div>

                            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setModalIndividualAbierto(false)}
                                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer transition text-xs font-semibold"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={guardandoIndividual}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl cursor-pointer transition text-xs shadow-md shadow-indigo-950/50 flex items-center gap-1.5"
                                >
                                    {guardandoIndividual ? (
                                        <>
                                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                            <span>Guardando y Despachando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-3.5 h-3.5" />
                                            <span>Guardar y Enviar Credenciales</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN DE VOTANTE */}
            {votanteAEliminar && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="max-w-md w-full glass-panel border border-rose-900/80 rounded-2xl p-6 space-y-4 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-rose-400" />
                                <h3 className="text-sm font-bold text-white">Eliminar Elector del Censo</h3>
                            </div>
                            <button
                                onClick={() => setVotanteAEliminar(null)}
                                className="text-slate-400 hover:text-white transition cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-1.5">
                            <div>
                                <span className="text-slate-500">Documento:</span>{' '}
                                <strong className="text-white font-mono">{votanteAEliminar.documento_identidad}</strong>
                            </div>
                            <div>
                                <span className="text-slate-500">Elector:</span>{' '}
                                <strong className="text-slate-200">
                                    {votanteAEliminar.nombres} {votanteAEliminar.apellidos}
                                </strong>
                            </div>
                            <div>
                                <span className="text-slate-500">Correo:</span>{' '}
                                <span className="text-slate-300 font-mono">{votanteAEliminar.correo_institucional}</span>
                            </div>
                            <div>
                                <span className="text-slate-500">Estado Sufragio:</span>{' '}
                                <span className="text-slate-300 font-medium">
                                    {votanteAEliminar.ha_solicitado_token ? 'Ya ejerció su voto' : 'Voto no emitido'}
                                </span>
                            </div>
                        </div>

                        <div className="p-3 bg-rose-950/30 border border-rose-900/50 rounded-xl text-[11px] text-rose-300 leading-relaxed">
                            ⚠️ Esta acción eliminará al elector del censo activo. La operación quedará registrada de forma inmutable en la bitácora de auditoría con su usuario y motivo.
                        </div>

                        <form onSubmit={handleConfirmarEliminacionVotante} className="space-y-3 text-xs">
                            <div>
                                <label className="block text-slate-300 font-semibold mb-1">
                                    Motivo de Eliminación (Auditoría) *
                                </label>
                                <textarea
                                    required
                                    rows={3}
                                    value={motivoEliminacion}
                                    onChange={(e) => setMotivoEliminacion(e.target.value)}
                                    placeholder="Indique la justificación para remover este elector del censo..."
                                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-lg text-white outline-none"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setVotanteAEliminar(null)}
                                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl cursor-pointer transition text-xs font-semibold"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={eliminandoVotante || !motivoEliminacion.trim()}
                                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-semibold rounded-xl cursor-pointer transition text-xs shadow-md shadow-rose-950/60 flex items-center gap-1.5"
                                >
                                    {eliminandoVotante ? (
                                        <>
                                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                            <span>Eliminando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className="w-3.5 h-3.5" />
                                            <span>Confirmar Eliminación</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
