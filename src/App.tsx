import { useState, useEffect } from 'react';
import { LogOut, ShieldCheck } from 'lucide-react';
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

const ID_ELECCION_DEFECTO = 'a0000000-0000-0000-0000-000000000001';

type Rol = 'VOTANTE' | 'AUDITOR' | 'ADMIN';
type VistaVotante = 'LOGIN' | 'CABINA' | 'COMPROBANTE' | 'VERIFICADOR';
type VistaAdmin = 'APERTURA' | 'ESCRUTINIO' | 'CIERRE' | 'ACTA' | 'LOGS' | 'CREDENCIALES';
type VistaAuditor = 'VERIFICADOR' | 'ESCRUTINIO' | 'ACTA' | 'LOGS';

export function App() {
  const [rolAutenticado, setRolAutenticado] = useState<Rol | null>(null);

  const [pasoVotante, setPasoVotante] = useState<VistaVotante>('LOGIN');
  const [vistaAdmin, setVistaAdmin] = useState<VistaAdmin>('APERTURA');
  const [vistaAuditor, setVistaAuditor] = useState<VistaAuditor>('VERIFICADOR');

  const [tokenVotacion, setTokenVotacion] = useState<string | null>(null);
  const [eleccionId, setEleccionId] = useState<string>(ID_ELECCION_DEFECTO);
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [loadingCandidatos, setLoadingCandidatos] = useState<boolean>(false);
  const [comprobante, setComprobante] = useState<string | null>(null);

  const handleCerrarSesion = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('staff_token');
    sessionStorage.removeItem('staff_token');
    sessionStorage.removeItem('staff_user');
    setRolAutenticado(null);
    setTokenVotacion(null);
    setComprobante(null);
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

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between py-8 px-4 print:bg-white print:py-0 print:px-0">
      <header className="print:hidden max-w-5xl mx-auto w-full flex justify-between items-center pb-6 border-b border-slate-900">
        <div>
          <span className="text-xs font-semibold text-slate-400 tracking-wider uppercase block">
            Sistema Electoral Blindado
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            {rolAutenticado ? `Perfil Activo: ${rolAutenticado}` : 'Control de Acceso'}
          </span>
        </div>

        {rolAutenticado && (
          <div className="flex items-center space-x-3">
            {rolAutenticado === 'VOTANTE' && (
              <div className="flex space-x-1">
                {pasoVotante !== 'CABINA' && (
                  <>
                    <button
                      onClick={() => setPasoVotante('LOGIN')}
                      className={`px-2.5 py-1 text-xs rounded border transition ${pasoVotante === 'LOGIN' || pasoVotante === 'COMPROBANTE'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                        }`}
                    >
                      Portal de Voto
                    </button>
                    <button
                      onClick={() => setPasoVotante('VERIFICADOR')}
                      className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded border transition ${pasoVotante === 'VERIFICADOR'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                        }`}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Verificar Papeleta
                    </button>
                  </>
                )}
              </div>
            )}

            {rolAutenticado === 'ADMIN' && (
              <div className="flex space-x-1">
                <button
                  onClick={() => setVistaAdmin('APERTURA')}
                  className={`px-2.5 py-1 text-xs rounded border ${vistaAdmin === 'APERTURA'
                    ? 'bg-indigo-950 text-indigo-300 border-indigo-700'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                >
                  Apertura
                </button>
                <button
                  onClick={() => setVistaAdmin('ESCRUTINIO')}
                  className={`px-2.5 py-1 text-xs rounded border ${vistaAdmin === 'ESCRUTINIO'
                    ? 'bg-indigo-950 text-indigo-300 border-indigo-700'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                >
                  Escrutinio
                </button>
                <button
                  onClick={() => setVistaAdmin('CIERRE')}
                  className={`px-2.5 py-1 text-xs rounded border ${vistaAdmin === 'CIERRE'
                    ? 'bg-indigo-950 text-indigo-300 border-indigo-700'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                >
                  Cierre
                </button>
                <button
                  onClick={() => setVistaAdmin('ACTA')}
                  className={`px-2.5 py-1 text-xs rounded border ${vistaAdmin === 'ACTA'
                    ? 'bg-indigo-950 text-indigo-300 border-indigo-700'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                >
                  Acta
                </button>
                <button
                  onClick={() => setVistaAdmin('LOGS')}
                  className={`px-2.5 py-1 text-xs rounded border ${vistaAdmin === 'LOGS'
                    ? 'bg-indigo-950 text-indigo-300 border-indigo-700'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                >
                  Bitácora
                </button>
                <button
                  onClick={() => setVistaAdmin('CREDENCIALES')}
                  className={`px-2.5 py-1 text-xs rounded border ${vistaAdmin === 'CREDENCIALES'
                    ? 'bg-indigo-950 text-indigo-300 border-indigo-700'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                >
                  Personal / Staff
                </button>
              </div>
            )}

            {rolAutenticado === 'AUDITOR' && (
              <div className="flex space-x-1">
                <button
                  onClick={() => setVistaAuditor('VERIFICADOR')}
                  className={`px-2.5 py-1 text-xs rounded border ${vistaAuditor === 'VERIFICADOR'
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                >
                  Verificador SHA-256
                </button>
                <button
                  onClick={() => setVistaAuditor('ESCRUTINIO')}
                  className={`px-2.5 py-1 text-xs rounded border ${vistaAuditor === 'ESCRUTINIO'
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                >
                  Escrutinio
                </button>
                <button
                  onClick={() => setVistaAuditor('ACTA')}
                  className={`px-2.5 py-1 text-xs rounded border ${vistaAuditor === 'ACTA'
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                >
                  Acta
                </button>
                <button
                  onClick={() => setVistaAuditor('LOGS')}
                  className={`px-2.5 py-1 text-xs rounded border ${vistaAuditor === 'LOGS'
                    ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                    }`}
                >
                  Bitácora
                </button>
              </div>
            )}

            <button
              onClick={handleCerrarSesion}
              className="flex items-center space-x-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs rounded-lg transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>Salir</span>
            </button>
          </div>
        )}
      </header>

      <main className="my-auto py-6 print:py-0">
        {!rolAutenticado && (
          <LoginRol
            onAccesoConcedido={(rol) => {
              setRolAutenticado(rol);
            }}
          />
        )}

        {/* MÓDULO VOTANTE */}
        {rolAutenticado === 'VOTANTE' && (
          <>
            {pasoVotante === 'LOGIN' && <LoginVotante onLoginExitoso={handleLoginExitoso} />}
            {pasoVotante === 'CABINA' && tokenVotacion && (
              loadingCandidatos ? (
                <div className="text-center text-slate-400 text-sm">Cargando papeleta electoral...</div>
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
          </>
        )}

        {/* MÓDULO AUDITOR */}
        {rolAutenticado === 'AUDITOR' && (
          <>
            {vistaAuditor === 'VERIFICADOR' && (
              <VerificadorComprobante eleccionId={eleccionId} onVolver={() => setVistaAuditor('ESCRUTINIO')} />
            )}
            {vistaAuditor === 'ESCRUTINIO' && (
              <PanelEscrutinio eleccionId={eleccionId} onVolver={() => setVistaAuditor('VERIFICADOR')} />
            )}
            {vistaAuditor === 'ACTA' && (
              <ActaEscrutinio eleccionId={eleccionId} onVolver={() => setVistaAuditor('VERIFICADOR')} />
            )}
            {vistaAuditor === 'LOGS' && (
              <PanelLogsAuditoria eleccionId={eleccionId} onVolver={() => setVistaAuditor('VERIFICADOR')} />
            )}
          </>
        )}

        {/* MÓDULO ADMINISTRADOR */}
        {rolAutenticado === 'ADMIN' && (
          <>
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
          </>
        )}
      </main>

      <footer className="print:hidden text-center text-[11px] text-slate-500">
        Cumplimiento estricto de secreto de voto y aislamiento de censo.
      </footer>
    </div>
  );
}

export default App;