import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { loginPaso1, loginPaso2Mfa } from '../controllers/authController';
import { censoDb } from '../config/supabase';

const router = Router();

// Rutas de autenticación
router.post('/login-paso1', loginPaso1);
router.post('/login-paso2', loginPaso2Mfa);
router.post('/login-paso2-mfa', loginPaso2Mfa);

// Endpoint de prueba / seed
router.post('/seed-votante', async (req: Request, res: Response): Promise<void> => {
    try {
        const { documentoIdentidad, password, nombres, apellidos, correo } = req.body;

        if (!documentoIdentidad || !password) {
            res.status(400).json({ success: false, error: 'Documento y contraseña requeridos' });
            return;
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        const { data, error } = await censoDb
            .from('votantes')
            .upsert(
                {
                    documento_identidad: documentoIdentidad,
                    correo_institucional: correo || `${documentoIdentidad}@empresa.com`,
                    nombres: nombres || 'Usuario',
                    apellidos: apellidos || 'Prueba',
                    password_hash,
                    esta_habilitado: true,
                    ha_solicitado_token: false,
                },
                { onConflict: 'documento_identidad' }
            )
            .select();

        if (error) {
            res.status(500).json({ success: false, error: error.message });
            return;
        }

        res.json({
            success: true,
            message: 'Votante configurado correctamente',
            data,
        });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;