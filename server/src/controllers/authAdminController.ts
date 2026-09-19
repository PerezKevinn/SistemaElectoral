import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { censoDb } from '../config/supabase';

const getJwtSecret = (): string => {
    const secret = process.env.JWT_CHALLENGE_SECRET || process.env.JWT_SECRET;
    if (!secret || secret.length < 16) {
        throw new Error('Configuración de seguridad insuficiente: Se requiere JWT_CHALLENGE_SECRET robusto.');
    }
    return secret;
};

export const loginAdmin = async (req: Request, res: Response): Promise<void> => {
    try {
        const documentoRaw = req.body.documentoIdentidad || req.body.documento || req.body.cedula;
        const passwordRaw = req.body.clave || req.body.password || req.body.contrasena;
        const rolSolicitado = (req.body.rol || 'ADMIN').toString().trim().toUpperCase();

        if (!documentoRaw || !passwordRaw) {
            res.status(400).json({ success: false, error: 'Documento y contraseña requeridos.' });
            return;
        }

        const documento = String(documentoRaw).trim();
        const password = String(passwordRaw).trim();

        // Consulta en la base de datos del censo
        const { data: funcionario, error } = await censoDb
            .from('personal_electoral')
            .select('*')
            .eq('documento_identidad', documento)
            .eq('esta_activo', true)
            .maybeSingle();

        if (error || !funcionario) {
            res.status(401).json({ success: false, error: 'Credenciales institucionales incorrectas o no autorizadas.' });
            return;
        }

        if (funcionario.rol !== rolSolicitado) {
            res.status(401).json({ success: false, error: 'Credenciales institucionales incorrectas o no autorizadas.' });
            return;
        }

        // Validación de contraseña con bcrypt
        const passwordValida = await bcrypt.compare(password, funcionario.password_hash);
        if (!passwordValida) {
            res.status(401).json({ success: false, error: 'Credenciales institucionales incorrectas o no autorizadas.' });
            return;
        }

        // Generación del token JWT
        const token = jwt.sign(
            {
                id: funcionario.id,
                documento: funcionario.documento_identidad,
                nombre: `${funcionario.nombres} ${funcionario.apellidos}`,
                cargo: funcionario.cargo,
                rol: funcionario.rol,
            },
            getJwtSecret(),
            { expiresIn: '8h', algorithm: 'HS256' }
        );

        res.json({
            success: true,
            token,
            usuario: {
                id: funcionario.id,
                documento: funcionario.documento_identidad,
                nombre: `${funcionario.nombres} ${funcionario.apellidos}`,
                cargo: funcionario.cargo,
                rol: funcionario.rol,
            },
        });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// Exportar alias para las rutas que importen loginFuncionario
export const loginFuncionario = loginAdmin;