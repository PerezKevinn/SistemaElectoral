import { Router } from 'express';
import {
    cargarCensoMasivo,
    registrarVotanteIndividual,
    listarVotantesCenso,
    reenviarCredencialesVotante,
    cambiarEstadoHabilitacion,
    obtenerEstadoSmtp,
    eliminarVotante,
} from '../controllers/censoController';
import {
    crearSolicitudRegistro,
    consultarEstadoSolicitud,
    listarSolicitudes,
    aprobarSolicitud,
    rechazarSolicitud,
    aprobarSolicitudesMasivo,
} from '../controllers/solicitudesController';
import { requireRol } from '../middleware/authRole';

const router = Router();

// Rutas Públicas de Solicitud de Registro de Votante (Con validación anti-duplicados)
router.post('/solicitudes/crear', crearSolicitudRegistro);
router.get('/solicitudes/estado/:documento', consultarEstadoSolicitud);

// Rutas de Verificación y Aprobación de Solicitudes (Rol ADMIN y AUDITOR)
router.get('/solicitudes', requireRol(['ADMIN', 'AUDITOR']), listarSolicitudes);
router.post('/solicitudes/aprobar', requireRol(['ADMIN', 'AUDITOR']), aprobarSolicitud);
router.post('/solicitudes/rechazar', requireRol(['ADMIN', 'AUDITOR']), rechazarSolicitud);
router.post('/solicitudes/aprobar-masivo', requireRol(['ADMIN', 'AUDITOR']), aprobarSolicitudesMasivo);

// Rutas de administración directa del censo
router.post('/cargar-masivo', requireRol(['ADMIN']), cargarCensoMasivo);
router.post('/crear', requireRol(['ADMIN']), registrarVotanteIndividual);
router.get('/votantes', requireRol(['ADMIN', 'AUDITOR']), listarVotantesCenso);
router.get('/estado-smtp', requireRol(['ADMIN', 'AUDITOR']), obtenerEstadoSmtp);
router.post('/reenviar-credencial', requireRol(['ADMIN']), reenviarCredencialesVotante);
router.post('/estado', requireRol(['ADMIN']), cambiarEstadoHabilitacion);
router.post('/eliminar', requireRol(['ADMIN']), eliminarVotante);
router.delete('/:id', requireRol(['ADMIN']), eliminarVotante);

export default router;
