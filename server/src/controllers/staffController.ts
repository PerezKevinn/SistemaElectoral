import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { censoDb } from '../config/supabase';
import { AuthRequest } from '../middleware/authRole';

// 1. Login de Funcionarios
export const loginStaff = async (req: Request, res: Response): Promise<void> => {
    try {
        const documento = (req.body.documento || req.body.documentoIdentidad || req.body.cedula || '').toString().trim();
        const password = (req.body.clave || req.body.password || req.body.contrasena || '').toString().trim();

        if (!documento || !password) {
            res.status(400).json({ success: false, error: 'Documento y contraseña requeridos' });
            return;
        }

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

        const passwordValida = await bcrypt.compare(password, funcionario.password_hash);
        if (!passwordValida) {
            res.status(401).json({ success: false, error: 'Credenciales inválidas.' });
            return;
        }

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

// 2. Listar Funcionarios
export const listarStaff = async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { data, error } = await censoDb
            .from('personal_electoral')
            .select('id, documento_identidad, nombres, apellidos, cargo, rol, esta_activo, created_at')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ success: true, data });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// 3. Crear Funcionario
export const crearStaff = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { documento_identidad, nombres, apellidos, cargo, rol, password } = req.body;

        if (!documento_identidad || !nombres || !apellidos || !cargo || !rol || !password) {
            res.status(400).json({ success: false, error: 'Todos los campos son obligatorios' });
            return;
        }

        const password_hash = await bcrypt.hash(password, 10);

        const { data, error } = await censoDb
            .from('personal_electoral')
            .insert([
                {
                    documento_identidad: documento_identidad.toString().trim(),
                    nombres: nombres.trim(),
                    apellidos: apellidos.trim(),
                    cargo: cargo.trim(),
                    rol: rol.toUpperCase(),
                    password_hash,
                    esta_activo: true,
                },
            ])
            .select('id, documento_identidad, nombres, apellidos, cargo, rol, esta_activo')
            .single();

        if (error) throw error;
        res.json({ success: true, data });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// Alternar Estado
export const alternarEstadoStaff = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = req.body.idUsuario || req.body.id;
        const esta_activo = req.body.activo !== undefined ? req.body.activo : req.body.esta_activo;

        if (!id) {
            res.status(400).json({ success: false, error: 'ID de usuario requerido' });
            return;
        }

        const { data, error } = await censoDb
            .from('personal_electoral')
            .update({ esta_activo })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        res.json({ success: true, data });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
};

// Cambiar Contraseña
export const cambiarPasswordStaff = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = req.body.idUsuario || req.body.id;
        const password = req.body.nuevaPassword || req.body.password;

        if (!id || !password) {
            res.status(400).json({ success: false, error: 'ID y nueva contraseña requeridos' });
            return;
        }

        const password_hash = await bcrypt.hash(password, 10);

        const { error } = await censoDb
            .from('personal_electoral')
            .update({ password_hash })
            .eq('id', id);

        if (error) throw error;
        res.json({ success: true, message: 'Contraseña actualizada exitosamente' });
    } catch (err: any) {
        res.status(500).json({ success: false, error: err.message });
    }
};