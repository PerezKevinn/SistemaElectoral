import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { censoDb } from '../config/supabase';

export interface UsuarioPayload {
    id?: string;
    id_personal?: string;
    rol: 'ADMIN' | 'AUDITOR';
    correo?: string;
    nombre?: string;
    nombres?: string;
    apellidos?: string;
    cargo?: string;
    documento?: string;
    [key: string]: any;
}

export interface AuthRequest extends Request {
    usuario?: UsuarioPayload;
    user?: UsuarioPayload;
}

const getJwtSecret = (): string => {
    const secret = process.env.JWT_CHALLENGE_SECRET || process.env.JWT_SECRET;
    if (!secret || secret.length < 16) {
        throw new Error('Configuración de seguridad insuficiente: JWT secret ausente.');
    }
    return secret;
};

export const verificarRol = (rolesPermitidos: ('ADMIN' | 'AUDITOR')[]) => {
    return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                res.status(401).json({ success: false, error: 'Token de autorización ausente o con formato inválido.' });
                return;
            }

            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ['HS256'] }) as UsuarioPayload;

            if (!decoded || !rolesPermitidos.includes(decoded.rol)) {
                res.status(403).json({ success: false, error: 'Acceso no autorizado: Se requieren privilegios institucionales de rol.' });
                return;
            }

            // Comprobación en vivo del estado del usuario en la base de datos
            if (decoded.id) {
                const { data: staff, error } = await censoDb
                    .from('personal_electoral')
                    .select('esta_activo')
                    .eq('id', decoded.id)
                    .maybeSingle();

                if (error || !staff || !staff.esta_activo) {
                    res.status(403).json({
                        success: false,
                        error: 'Sesión revocada: La cuenta del funcionario ha sido desactivada o no existe.',
                    });
                    return;
                }
            }

            req.usuario = decoded;
            req.user = decoded;
            next();
        } catch (error: any) {
            res.status(401).json({ success: false, error: 'Sesión inválida, alterada o expirada.' });
        }
    };
};

export const requireRol = verificarRol;