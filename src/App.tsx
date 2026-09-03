import { useState, useEffect } from 'react';
import { LogOut, ShieldCheck, Play, BarChart3, Lock, FileText, Activity, Users, Menu, X, User, Link2 } from 'lucide-react';
import { LoginRol } from './components/LoginRol';
import { LoginVotante } from './components/LoginVotante';
import { CabinaVotacion, type Candidato } from './components/CabinaVotacion';
import { ComprobanteVoto } from './components/ComprobanteVoto';
import { PanelEscrutinio } from './components/PanelEscrutinio';
import { VerificadorComprobante } from './components/VerificadorComprobante';
import { PanelAdminCierre } from './components/PanelAdminCierre';
import { PanelAdminApertura } from './components/PanelAdminApertura';
import { ActaEscrutinio } from './components/ActaEscrutinio';
import { PanelLogsAuditoria } from './components/PanelLogsAuditoria';
import { PanelCredenciales } from './components/PanelCredenciales';
import { VerificadorCadenaHashes } from './components/VerificadorCadenaHashes';
import { ToastProvider } from './components/Toast';

const ID_ELECCION_DEFECTO = 'a0000000-0000-0000-0000-000000000001';

type Rol = 'VOTANTE' | 'AUDITOR' | 'ADMIN';
type VistaVotante = 'LOGIN' | 'CABINA' | 'COMPROBANTE' | 'VERIFICADOR';
type VistaAdmin = 'APERTURA' | 'ESCRUTINIO' | 'CADENA' | 'CIERRE' | 'ACTA' | 'LOGS' | 'CREDENCIALES';
type VistaAuditor = 'VERIFICADOR' | 'ESCRUTINIO' | 'CADENA' | 'ACTA' | 'LOGS';

interface UsuarioStaff {
  id: string;
  documento: string;
  nombre: string;
  cargo: string;
  rol: Rol;
}

function AppContent() {
  const [rolAutenticado, setRolAutenticado] = useState<Rol | null>(null);
  const [usuarioStaff, setUsuarioStaff] = useState<UsuarioStaff | null>(null);
  const [menuMobileAbierto, setMenuMobileAbierto] = useState<boolean>(false);

  const [pasoVotante, setPasoVotante] = useState<VistaVotante>('LOGIN');
  const [vistaAdmin, setVistaAdmin] = useState<VistaAdmin>('APERTURA');
  const [vistaAuditor, setVistaAuditor] = useState<VistaAuditor>('VERIFICADOR');

  const [tokenVotacion, setTokenVotacion] = useState<string | null>(null);
  const [eleccionId, setEleccionId] = useState<string>(ID_ELECCION_DEFECTO);
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [loadingCandidatos, setLoadingCandidatos] = useState<boolean>(false);
  const [comprobante, setComprobante] = useState<string | null>(null);

  // Cargar usuario staff desde almacenamiento si existe
  useEffect(() => {
    const rawUser = sessionStorage.getItem('staff_user');
    if (rawUser) {
      try {
        const parsed = JSON.parse(rawUser);
        setUsuarioStaff(parsed);
      } catch (e) {
        console.error('Error parseando usuario staff', e);
      }
    }
  }, [rolAutenticado]);

  const handleCerrarSesion = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('staff_token');
    sessionStorage.removeItem('staff_token');
    sessionStorage.removeItem('staff_user');
    setRolAutenticado(null);
    setUsuarioStaff(null);
    setTokenVotacion(null);
    setComprobante(null);
    setMenuMobileAbierto(false);
    setPasoVotante('LOGIN');
    setVistaAdmin('APERTURA');
    setVistaAuditor('VERIFICADOR');
  };

  const handleLoginExitoso = (token: string, eleccion: string) => {
    setTokenVotacion(token);
    setEleccionId(eleccion);
    setPasoVotante('CABINA');
  };

  useEffect(() => {
    if (rolAutenticado === 'VOTANTE' && pasoVotante === 'CABINA' && eleccionId) {
      setLoadingCandidatos(true);
      fetch(`/api/urna/candidatos?eleccionId=${eleccionId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setCandidatos(data.candidatos);
          }
        })
        .catch((err) => console.error('Error al cargar candidatos:', err))
        .finally(() => setLoadingCandidatos(false));
    }
  }, [rolAutenticado, pasoVotante, eleccionId]);

  const handleVotoCompletado = (comprobanteHash: string) => {
    setTokenVotacion(null);
    setComprobante(comprobanteHash);
    setPasoVotante('COMPROBANTE');
  };

  const handleReiniciarVotante = () => {
    setTokenVotacion(null);
    setComprobante(null);
    setPasoVotante('LOGIN');
  };

  // Opciones de navegación Admin
  const adminNavItems = [
    { id: 'APERTURA' as VistaAdmin, label: 'Apertura', icon: Play, desc: 'Configurar jornada y planchas' },
    { id: 'ESCRUTINIO' as VistaAdmin, label: 'Escrutinio', icon: BarChart3, desc: 'Conteo y tendencias en vivo' },
    { id: 'CADENA' as VistaAdmin, label: 'Cadena SHA-256', icon: Link2, desc: 'Auditoría matemática de inmutabilidad' },
    { id: 'CIERRE' as VistaAdmin, label: 'Cierre', icon: Lock, desc: 'Sellado definitivo de la urna' },
    { id: 'ACTA' as VistaAdmin, label: 'Acta Oficial', icon: FileText, desc: 'Generar y descargar acta legal' },
    { id: 'LOGS' as VistaAdmin, label: 'Bitácora', icon: Activity, desc: 'Auditoría y eventos registrados' },
    { id: 'CREDENCIALES' as VistaAdmin, label: 'Personal / Staff', icon: Users, desc: 'Administrar accesos y roles' },
  ];

  // Opciones de navegación Auditor
  const auditorNavItems = [
    { id: 'VERIFICADOR' as VistaAuditor, label: 'Verificador', icon: ShieldCheck, desc: 'Validar comprobantes de votantes' },
    { id: 'ESCRUTINIO' as VistaAuditor, label: 'Escrutinio', icon: BarChart3, desc: 'Resultados y participación' },
    { id: 'CADENA' as VistaAuditor, label: 'Cadena SHA-256', icon: Link2, desc: 'Verificar eslabones y hashes' },
    { id: 'ACTA' as VistaAuditor, label: 'Acta Oficial', icon: FileText, desc: 'Inspeccionar sellado de acta' },
    { id: 'LOGS' as VistaAuditor, label: 'Bitácora', icon: Activity, desc: 'Trazabilidad de operaciones' },
  ];

  return (
    <div className="min-h-screen bg-[#030712] flex flex-col justify-between text-slate-100 print:bg-white print:text-black">
      {/* Institutional Top Header */}
      <header className="print:hidden border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-xl sticky top-0 z-50 shadow-lg shadow-black/50">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3">

          {/* Logo & Institutional Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-900/90 via-slate-900 to-indigo-950 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-md shadow-indigo-950/60 flex-shrink-0">
              <ShieldCheck className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-[10px] font-bold tracking-widest uppercase text-indigo-400 font-mono">
                  Tribunal Electoral
                </span>
                <span className="w-1 h-1 rounded-full bg-slate-600 hidden sm:inline-block" />
                <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 border border-emerald-800/50 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Urna Online
                </span>
              </div>
              <h1 className="text-xs sm:text-sm lg:text-base font-bold text-white tracking-tight line-clamp-1">
                SISTEMA AUTÓNOMO DE VOTACIÓN Y ESCRUTINIO DIGITAL
              </h1>
              {usuarioStaff && (
                <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-400">
                  <User className="w-3 h-3 text-slate-500" />
                  <span className="text-slate-300 font-medium">{usuarioStaff.nombre}</span>
                  <span>•</span>
                  <span className="text-slate-400">{usuarioStaff.cargo}</span>
                </div>
              )}
            </div>
          </div>

          {/* Desktop & Mobile Actions */}
          <div className="flex items-center gap-2">
            {/* Session Actions Desktop */}
            {rolAutenticado && (
              <div className="hidden xl:flex items-center gap-1.5">
                {/* Profile Badge */}
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
                  <span className="text-slate-400">Rol:</span>
                  <span className={`font-semibold uppercase font-mono ${rolAutenticado === 'VOTANTE' ? 'text-emerald-400' :
                      rolAutenticado === 'AUDITOR' ? 'text-cyan-400' : 'text-indigo-400'
                    }`}>
                    {rolAutenticado}
                  </span>
                </div>

                {/* Logout Button */}
                <button
                  onClick={handleCerrarSesion}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-slate-800 hover:border-rose-800/60 text-xs font-medium rounded-xl transition cursor-pointer"
                  title="Cerrar sesión actual"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-400" />
                  <span>Salir</span>
                </button>
              </div>
            )}

            {/* Mobile / Tablet Hamburger Button */}
            {rolAutenticado && (
              <button
                type="button"
                onClick={() => setMenuMobileAbierto(!menuMobileAbierto)}
                className="xl:hidden p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer transition"
                aria-label="Abrir menú de navegación"
              >
                {menuMobileAbierto ? <X className="w-5 h-5 text-rose-400" /> : <Menu className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>

        {/* Desktop Secondary Navigation Bar for Admin / Auditor / Votante */}
        {rolAutenticado && (
          <div className="hidden xl:block border-t border-slate-800/60 bg-slate-950/90 py-2">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">

              {/* ADMIN TABS */}
              {rolAutenticado === 'ADMIN' && (
                <div className="flex items-center gap-1.5">
                  {adminNavItems.map((item) => {
                    const IconComponent = item.icon;
                    const isActive = vistaAdmin === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setVistaAdmin(item.id)}
                        className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${isActive
                            ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md shadow-indigo-950/60 ring-1 ring-indigo-400/30'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 border border-transparent hover:border-slate-800'
                          }`}
                      >
                        <IconComponent className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* AUDITOR TABS */}
              {rolAutenticado === 'AUDITOR' && (
                <div className="flex items-center gap-1.5">
                  {auditorNavItems.map((item) => {
                    const IconComponent = item.icon;
                    const isActive = vistaAuditor === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setVistaAuditor(item.id)}
                        className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${isActive
                            ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 text-white shadow-md shadow-cyan-950/60 ring-1 ring-cyan-400/30'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 border border-transparent hover:border-slate-800'
                          }`}
                      >
                        <IconComponent className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* VOTANTE TABS */}
              {rolAutenticado === 'VOTANTE' && pasoVotante !== 'CABINA' && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPasoVotante('LOGIN')}
                    className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${pasoVotante === 'LOGIN' || pasoVotante === 'COMPROBANTE'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/60 ring-1 ring-emerald-400/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 border border-transparent hover:border-slate-800'
                      }`}
                  >
                    <span>Portal de Voto</span>
                  </button>
                  <button
                    onClick={() => setPasoVotante('VERIFICADOR')}
                    className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${pasoVotante === 'VERIFICADOR'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/60 ring-1 ring-emerald-400/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 border border-transparent hover:border-slate-800'
                      }`}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verificar Papeleta</span>
                  </button>
                </div>
              )}

              {/* Status pill right */}
              <div className="text-[11px] font-mono text-slate-500 flex items-center gap-2">
                <span>Sesión Activa</span>
                <span>•</span>
                <span className="text-slate-400 font-semibold">{rolAutenticado}</span>
              </div>
            </div>
          </div>
        )}

        {/* Mobile / Tablet Collapsible Menu Drawer */}
        {rolAutenticado && menuMobileAbierto && (
          <div className="xl:hidden border-t border-slate-800 bg-slate-950/98 px-4 py-5 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">

            {/* User info on mobile */}
            {usuarioStaff && (
              <div className="p-3 mb-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">{usuarioStaff.nombre}</span>
                    <span className="text-[10px] text-slate-400 block">{usuarioStaff.cargo}</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                  {usuarioStaff.rol}
                </span>
              </div>
            )}

            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5 px-1">
              Módulos del Sistema
            </div>

            {/* ADMIN MOBILE MENU */}
            {rolAutenticado === 'ADMIN' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                {adminNavItems.map((item) => {
                  const IconComponent = item.icon;
                  const isActive = vistaAdmin === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setVistaAdmin(item.id);
                        setMenuMobileAbierto(false);
                      }}
                      className={`p-3 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer ${isActive
                          ? 'bg-indigo-950/60 border-indigo-500/80 ring-1 ring-indigo-500/40'
                          : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900 hover:border-slate-700'
                        }`}
                    >
                      <div className={`p-2 rounded-lg mt-0.5 ${isActive ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                        }`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <span className={`text-xs font-bold block ${isActive ? 'text-indigo-200' : 'text-slate-200'
                          }`}>
                          {item.label}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {item.desc}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* AUDITOR MOBILE MENU */}
            {rolAutenticado === 'AUDITOR' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                {auditorNavItems.map((item) => {
                  const IconComponent = item.icon;
                  const isActive = vistaAuditor === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setVistaAuditor(item.id);
                        setMenuMobileAbierto(false);
                      }}
                      className={`p-3 rounded-xl border text-left transition flex items-start gap-3 cursor-pointer ${isActive
                          ? 'bg-cyan-950/60 border-cyan-500/80 ring-1 ring-cyan-500/40'
                          : 'bg-slate-900/60 border-slate-800 hover:bg-slate-900 hover:border-slate-700'
                        }`}
                    >
                      <div className={`p-2 rounded-lg mt-0.5 ${isActive ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400'
                        }`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <span className={`text-xs font-bold block ${isActive ? 'text-cyan-200' : 'text-slate-200'
                          }`}>
                          {item.label}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {item.desc}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* VOTANTE MOBILE MENU */}
            {rolAutenticado === 'VOTANTE' && pasoVotante !== 'CABINA' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                <button
                  onClick={() => {
                    setPasoVotante('LOGIN');
                    setMenuMobileAbierto(false);
                  }}
                  className={`p-3 rounded-xl border text-left transition flex items-center gap-3 cursor-pointer ${pasoVotante === 'LOGIN' || pasoVotante === 'COMPROBANTE'
                      ? 'bg-emerald-950/60 border-emerald-500/80'
                      : 'bg-slate-900/60 border-slate-800'
                    }`}
                >
                  <span className="text-xs font-bold">Portal de Voto</span>
                </button>
                <button
                  onClick={() => {
                    setPasoVotante('VERIFICADOR');
                    setMenuMobileAbierto(false);
                  }}
                  className={`p-3 rounded-xl border text-left transition flex items-center gap-3 cursor-pointer ${pasoVotante === 'VERIFICADOR'
                      ? 'bg-emerald-950/60 border-emerald-500/80'
                      : 'bg-slate-900/60 border-slate-800'
                    }`}
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold">Verificar Papeleta</span>
                </button>
              </div>
            )}

            {/* Logout Mobile */}
            <button
              onClick={handleCerrarSesion}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-rose-950/40 text-rose-300 border border-rose-900/40 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        )}
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col justify-center print:py-0 print:px-0">
        {!rolAutenticado && (
          <LoginRol
            onAccesoConcedido={(rol) => {
              setRolAutenticado(rol);
            }}
          />
        )}

        {/* MÓDULO VOTANTE */}
        {rolAutenticado === 'VOTANTE' && (
          <div className="w-full">
            {pasoVotante === 'LOGIN' && <LoginVotante onLoginExitoso={handleLoginExitoso} />}
            {pasoVotante === 'CABINA' && tokenVotacion && (
              loadingCandidatos ? (
                <div className="glass-panel max-w-md mx-auto p-8 rounded-2xl text-center space-y-3">
                  <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto" />
                  <p className="text-sm font-semibold text-slate-200">Cargando papeleta electoral oficial...</p>
                  <p className="text-xs text-slate-400">Verificando firma de la mesa electoral</p>
                </div>
              ) : (
                <CabinaVotacion
                  eleccionId={eleccionId}
                  candidatos={candidatos}
                  tokenVotacion={tokenVotacion}
                  onVotoCompletado={handleVotoCompletado}
                />
              )
            )}
            {pasoVotante === 'COMPROBANTE' && comprobante && (
              <ComprobanteVoto comprobanteHash={comprobante} onFinalizar={handleReiniciarVotante} />
            )}
            {pasoVotante === 'VERIFICADOR' && (
              <VerificadorComprobante eleccionId={eleccionId} onVolver={() => setPasoVotante('LOGIN')} />
            )}
          </div>
        )}

        {/* MÓDULO AUDITOR */}
        {rolAutenticado === 'AUDITOR' && (
          <div className="w-full">
            {vistaAuditor === 'VERIFICADOR' && (
              <VerificadorComprobante eleccionId={eleccionId} onVolver={() => setVistaAuditor('ESCRUTINIO')} />
            )}
            {vistaAuditor === 'ESCRUTINIO' && (
              <PanelEscrutinio eleccionId={eleccionId} onVolver={() => setVistaAuditor('VERIFICADOR')} />
            )}
            {vistaAuditor === 'CADENA' && (
              <VerificadorCadenaHashes eleccionId={eleccionId} onVolver={() => setVistaAuditor('ESCRUTINIO')} />
            )}
            {vistaAuditor === 'ACTA' && (
              <ActaEscrutinio eleccionId={eleccionId} onVolver={() => setVistaAuditor('VERIFICADOR')} />
            )}
            {vistaAuditor === 'LOGS' && (
              <PanelLogsAuditoria eleccionId={eleccionId} onVolver={() => setVistaAuditor('VERIFICADOR')} />
            )}
          </div>
        )}

        {/* MÓDULO ADMINISTRADOR */}
        {rolAutenticado === 'ADMIN' && (
          <div className="w-full">
            {vistaAdmin === 'APERTURA' && (
              <PanelAdminApertura
                onEleccionIniciada={(id) => {
                  setEleccionId(id);
                  setVistaAdmin('ESCRUTINIO');
                }}
                onVolver={() => setVistaAdmin('ESCRUTINIO')}
              />
            )}
            {vistaAdmin === 'ESCRUTINIO' && (
              <PanelEscrutinio eleccionId={eleccionId} onVolver={() => setVistaAdmin('APERTURA')} />
            )}
            {vistaAdmin === 'CADENA' && (
              <VerificadorCadenaHashes eleccionId={eleccionId} onVolver={() => setVistaAdmin('ESCRUTINIO')} />
            )}
            {vistaAdmin === 'CIERRE' && (
              <PanelAdminCierre
                eleccionId={eleccionId}
                onVolver={() => setVistaAdmin('ESCRUTINIO')}
                onCierreCompletado={() => setVistaAdmin('ACTA')}
              />
            )}
            {vistaAdmin === 'ACTA' && (
              <ActaEscrutinio eleccionId={eleccionId} onVolver={() => setVistaAdmin('ESCRUTINIO')} />
            )}
            {vistaAdmin === 'LOGS' && (
              <PanelLogsAuditoria eleccionId={eleccionId} onVolver={() => setVistaAdmin('ESCRUTINIO')} />
            )}
            {vistaAdmin === 'CREDENCIALES' && (
              <PanelCredenciales onVolver={() => setVistaAdmin('ESCRUTINIO')} />
            )}
          </div>
        )}
      </main>

      {/* Institutional Guarantee Footer */}
      <footer className="print:hidden border-t border-slate-800/80 bg-slate-950/60 backdrop-blur-md py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-5 border-b border-slate-800/60 text-xs">
            <div className="flex items-start gap-2.5">
              <span className="text-emerald-400 font-bold">✓</span>
              <div>
                <span className="font-semibold text-slate-300 block">Secreto de Voto Blindado</span>
                <span className="text-slate-400 text-[11px]">Aislamiento absoluto entre identidad y papeleta</span>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-cyan-400 font-bold">✓</span>
              <div>
                <span className="font-semibold text-slate-300 block">Inmutabilidad del Sufragio</span>
                <span className="text-slate-400 text-[11px]">Sellado digital y verificación de comprobantes</span>
              </div>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="text-indigo-400 font-bold">✓</span>
              <div>
                <span className="font-semibold text-slate-300 block">Auditoría Electoral Continua</span>
                <span className="text-slate-400 text-[11px]">Trazabilidad de eventos bajo bitácora blindada</span>
              </div>
            </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row justify-between items-center gap-2 text-[11px] text-slate-400">
            <div>
              © 2026 Tribunal Electoral Autónomo • Sistema de Votación y Escrutinio Digital
            </div>
            <div className="flex items-center gap-3 font-mono text-[10px]">
              <span>Canal Seguro</span>
              <span>•</span>
              <span>Sellado Digital</span>
              <span>•</span>
              <span className="text-emerald-400">ESTADO OPERACIONAL NORMAL</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

export default App;