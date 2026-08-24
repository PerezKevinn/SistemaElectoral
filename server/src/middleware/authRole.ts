import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

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

export const verificarRol = (rolesPermitidos: ('ADMIN' | 'AUDITOR')[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                res.status(401).json({ success: false, error: 'Token de autorización ausente' });
                return;
            }

            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_CHALLENGE_SECRET!) as UsuarioPayload;

            if (!rolesPermitidos.includes(decoded.rol)) {
                res.status(403).json({ success: false, error: 'Acceso no autorizado para este rol' });
                return;
            }

            req.usuario = decoded;
            req.user = decoded;
            next();
        } catch (error) {
            res.status(401).json({ success: false, error: 'Sesión inválida o expirada' });
        }
    };
};

export const requireRol = verificarRol;