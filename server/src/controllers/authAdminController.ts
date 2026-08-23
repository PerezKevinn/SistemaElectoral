import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { urnaDb } from '../config/supabase';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_change_in_prod';

export const loginFuncionario = async (req: Request, res: Response): Promise<void> => {
    try {
        const { documento, clave } = req.body;

        if (!documento || !clave) {
            res.status(400).json({ success: false, error: 'Documento y contraseña requeridos.' });
            return;
        }

        // Consultar usuario en la base de datos
        const { data: usuario, error } = await urnaDb
            .from('usuarios_staff')
            .select('id_usuario, documento, nombre_completo, cargo, rol, password_hash, activo')
            .eq('documento', documento.trim())
            .single();

        if (error || !usuario || !usuario.activo) {
            res.status(401).json({ success: false, error: 'Funcionario no encontrado o inactivo.' });
            return;
        }

        // Validar contraseña con pgcrypto crypt
        const { data: esValido, error: errRpc } = await urnaDb.rpc('validar_password_staff', {
            p_password_ingresada: clave,
            p_hash_almacenado: usuario.password_hash,
        });

        if (errRpc || !esValido) {
            res.status(401).json({ success: false, error: 'Contraseña incorrecta.' });
            return;
        }

        // Generar JWT con la identidad completa
        const token = jwt.sign(
            {
                id: usuario.id_usuario,
                documento: usuario.documento,
                nombre: usuario.nombre_completo,
                cargo: usuario.cargo,
                rol: usuario.rol,
            },
            JWT_SECRET,
            { expiresIn: '4h' }
        );

        res.json({
            success: true,
            token,
            usuario: {
                documento: usuario.documento,
                nombre: usuario.nombre_completo,
                cargo: usuario.cargo,
                rol: usuario.rol,
            },
        });
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'Error en la autenticación de funcionarios.' });
    }
};