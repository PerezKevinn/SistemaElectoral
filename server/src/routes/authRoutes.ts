import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { loginPaso1, cambiarPasswordInicial, loginPaso2Mfa, verificarVotante, obtenerSetupMfa } from '../controllers/authController';
import { censoDb } from '../config/supabase';
import { authLimiter, totpLimiter } from '../middleware/security';
import { requireRol } from '../middleware/authRole';

const router = Router();

// Rutas de autenticación protegidas con Rate Limiting anti-fuerza bruta
router.post('/login-paso1', authLimiter, loginPaso1);
router.post('/cambiar-password-inicial', authLimiter, cambiarPasswordInicial);
router.post('/login-paso2', totpLimiter, loginPaso2Mfa);
router.post('/login-paso2-mfa', totpLimiter, loginPaso2Mfa);
router.get('/verificar/:documento', requireRol(['ADMIN', 'AUDITOR']), verificarVotante);
router.post('/setup-mfa', authLimiter, obtenerSetupMfa);

// Endpoint de prueba / seed (Exclusivo para entornos de desarrollo local; bloqueado en producción)
router.post('/seed-votante', async (req: Request, res: Response): Promise<void> => {
    try {
        if (process.env.NODE_ENV === 'production') {
            res.status(404).json({ success: false, error: 'Endpoint no disponible en producción.' });
            return;
        }

        const seedKey = req.headers['x-admin-seed-key'];
        const seedSecret = process.env.ADMIN_SEED_SECRET;

        // Bloqueo estricto: la variable debe estar configurada y coincidir
        if (!seedSecret || !seedKey || seedKey !== seedSecret) {
            res.status(403).json({
                success: false,
                error: 'Acceso denegado: Aprovisionamiento directo deshabilitado o no autorizado.',
            });
            return;
        }

        const { documentoIdentidad, password, nombres, apellidos, correo } = req.body;

        if (!documentoIdentidad || !password) {
            res.status(400).json({ success: false, error: 'Documento y contraseña requeridos.' });
            return;
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(String(password).trim(), salt);

        const { data, error } = await censoDb
            .from('votantes')
            .upsert(
                {
                    documento_identidad: String(documentoIdentidad).trim(),
                    correo_institucional: correo || `${documentoIdentidad}@empresa.com`,
                    nombres: nombres || 'Usuario',
                    apellidos: apellidos || 'Oficial',
                    password_hash,
                    esta_habilitado: true,
                    ha_solicitado_token: false,
                },
                { onConflict: 'documento_identidad' }
            )
            .select();

        if (error) {
            res.status(500).json({ success: false, error: 'Error al registrar en censo.' });
            return;
        }

        res.json({
            success: true,
            message: 'Votante aprovisionado con éxito en entorno de desarrollo.',
            data,
        });
    } catch (err: any) {
        res.status(500).json({ success: false, error: 'Error interno en aprovisionamiento.' });
    }
});

export default router;