import { Router } from 'express';
import {
    emitirVoto,
    obtenerCandidatos,
    obtenerResultados,
    verificarComprobante,
    cerrarEleccion,
    obtenerActaOficial,
    crearEleccion,
    abrirEleccion,
    obtenerLogsAuditoria,
} from '../controllers/urnaController';
import {
    listarStaff,
    crearStaff,
    alternarEstadoStaff,
    cambiarPasswordStaff,
} from '../controllers/staffController';
import { loginFuncionario } from '../controllers/authAdminController';
import { requireRol } from '../middleware/authRole';



const router = Router();

// Rutas Públicas / Votante
router.get('/candidatos', obtenerCandidatos);
router.post('/votar', emitirVoto);
router.post('/verificar', verificarComprobante);
router.post('/login-staff', loginFuncionario);

// Rutas con Control de Acceso por Roles (RBAC)
router.get('/logs', requireRol(['ADMIN', 'AUDITOR']), obtenerLogsAuditoria);
router.get('/resultados', requireRol(['ADMIN', 'AUDITOR']), obtenerResultados);
router.get('/acta', requireRol(['ADMIN', 'AUDITOR']), obtenerActaOficial);
router.post('/crear', requireRol(['ADMIN']), crearEleccion);
router.post('/abrir', requireRol(['ADMIN']), abrirEleccion);
router.post('/cerrar', requireRol(['ADMIN']), cerrarEleccion);

// Módulo de Administración de Credenciales / Staff (Solo ADMIN)
router.get('/staff', requireRol(['ADMIN']), listarStaff);
router.post('/staff/crear', requireRol(['ADMIN']), crearStaff);
router.post('/staff/estado', requireRol(['ADMIN']), alternarEstadoStaff);
router.post('/staff/password', requireRol(['ADMIN']), cambiarPasswordStaff);

export default router;