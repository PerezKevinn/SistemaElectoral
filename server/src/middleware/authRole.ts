import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        rol: 'ADMIN' | 'AUDITOR';
        correo: string;
    };
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
            const decoded = jwt.verify(token, process.env.JWT_CHALLENGE_SECRET!) as any;

            if (!rolesPermitidos.includes(decoded.rol)) {
                res.status(403).json({ success: false, error: 'Acceso no autorizado para este rol' });
                return;
            }

            req.user = decoded;
            next();
        } catch (error) {
            res.status(401).json({ success: false, error: 'Sesión inválida o expirada' });
        }
    };
};