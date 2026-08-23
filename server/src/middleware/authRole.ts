import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_key_change_in_prod';

export interface UsuarioStaffPayload {
    id: string;
    documento: string;
    nombre: string;
    cargo: string;
    rol: 'ADMIN' | 'AUDITOR';
}

export interface AuthRequest extends Request {
    usuario?: UsuarioStaffPayload;
}

export const requireRol = (rolesPermitidos: ('ADMIN' | 'AUDITOR')[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                error: 'No autorizado. Token de sesión no provisto.',
            });
            return;
        }

        const token = authHeader.split(' ')[1];

        try {
            const decoded = jwt.verify(token, JWT_SECRET) as UsuarioStaffPayload;

            if (!rolesPermitidos.includes(decoded.rol)) {
                res.status(403).json({
                    success: false,
                    error: `Acceso denegado. Se requiere rol: ${rolesPermitidos.join(' o ')}.`,
                });
                return;
            }

            req.usuario = decoded;
            next();
        } catch (err) {
            res.status(401).json({
                success: false,
                error: 'Sesión expirada o token inválido.',
            });
        }
    };
};