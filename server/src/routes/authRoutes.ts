import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { loginPaso1, loginPaso2Mfa, verificarVotante, obtenerSetupMfa } from '../controllers/authController';
import { censoDb } from '../config/supabase';
import { authLimiter, totpLimiter } from '../middleware/security';

const router = Router();

// Rutas de autenticación protegidas con Rate Limiting anti-fuerza bruta
router.post('/login-paso1', authLimiter, loginPaso1);
router.post('/login-paso2', totpLimiter, loginPaso2Mfa);
router.post('/login-paso2-mfa', totpLimiter, loginPaso2Mfa);
router.get('/verificar/:documento', verificarVotante);
router.post('/setup-mfa', authLimiter, obtenerSetupMfa);

// Endpoint de prueba / seed (Protegido estrictamente)
router.post('/seed-votante', async (req: Request, res: Response): Promise<void> => {
    try {
        const seedKey = req.headers['x-admin-seed-key'];
        const seedSecret = process.env.ADMIN_SEED_SECRET || 'SEED_SECRET_DISABLED_IN_PROD';

        // Bloqueo estricto si no coincide la clave administrativa
        if (!seedKey || seedKey !== seedSecret) {
            res.status(403).json({
                success: false,
                error: 'Acceso denegado: El aprovisionamiento directo requiere autorización de infraestructura.',
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
            message: 'Votante aprovisionado con éxito.',
            data,
        });
    } catch (err: any) {
        res.status(500).json({ success: false, error: 'Error interno en aprovisionamiento.' });
    }
});

export default router;