import { Router } from 'express';
import {
    cargarCensoMasivo,
    registrarVotanteIndividual,
    listarVotantesCenso,
    reenviarCredencialesVotante,
    cambiarEstadoHabilitacion,
} from '../controllers/censoController';
import { requireRol } from '../middleware/authRole';

const router = Router();

// Todas las rutas de administración del censo requieren rol ADMIN
router.post('/cargar-masivo', requireRol(['ADMIN']), cargarCensoMasivo);
router.post('/crear', requireRol(['ADMIN']), registrarVotanteIndividual);
router.get('/votantes', requireRol(['ADMIN', 'AUDITOR']), listarVotantesCenso);
router.post('/reenviar-credencial', requireRol(['ADMIN']), reenviarCredencialesVotante);
router.post('/estado', requireRol(['ADMIN']), cambiarEstadoHabilitacion);

export default router;
