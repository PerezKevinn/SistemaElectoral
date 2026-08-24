import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { censoDb } from '../config/supabase';

export const loginStaff = async (req: Request, res: Response): Promise<void> => {
    try {
        const documento = (req.body.documento || req.body.documentoIdentidad || req.body.cedula || '').toString().trim();
        const password = (req.body.clave || req.body.password || req.body.contrasena || '').toString().trim();

        if (!documento || !password) {
            res.status(400).json({ success: false, error: 'Documento y contraseña requeridos' });
            return;
        }

        // Buscar funcionario activo en personal_electoral
        const { data: funcionario, error } = await censoDb
            .from('personal_electoral')
            .select('*')
            .eq('documento_identidad', documento)
            .eq('esta_activo', true)
            .maybeSingle();

        if (error || !funcionario) {
            res.status(401).json({ success: false, error: 'Funcionario no encontrado o inactivo.' });
            return;
        }

        // Validar contraseña
        const passwordValida = await bcrypt.compare(password, funcionario.password_hash);
        if (!passwordValida) {
            res.status(401).json({ success: false, error: 'Credenciales inválidas.' });
            return;
        }

        // Generar token
        const token = jwt.sign(
            {
                id: funcionario.id,
                documento: funcionario.documento_identidad,
                nombre: `${funcionario.nombres} ${funcionario.apellidos}`,
                cargo: funcionario.cargo,
                rol: funcionario.rol,
            },
            process.env.JWT_CHALLENGE_SECRET || 'secret_fallback',
            { expiresIn: '8h' }
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