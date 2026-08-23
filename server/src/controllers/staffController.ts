import { Response } from 'express';
import { AuthRequest } from '../middleware/authRole';
import { urnaDb } from '../config/supabase';

// Función auxiliar para obtener metadata del funcionario que ejecuta la acción
const obtenerInfoOperador = (req: AuthRequest) => {
    const ejecutadoPor = req.usuario
        ? `${req.usuario.nombre} (${req.usuario.cargo} - CC ${req.usuario.documento})`
        : 'ADMIN_DESCONOCIDO';
    const ipOrigen = req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || 'Desconocido';

    return { ejecutadoPor, ipOrigen, userAgent };
};

// 1. Listar Funcionarios
export const listarStaff = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { data, error } = await urnaDb
            .from('usuarios_staff')
            .select('id_usuario, documento, nombre_completo, cargo, correo, rol, activo, creado_at')
            .order('creado_at', { ascending: false });

        if (error) throw error;

        res.json({ success: true, staff: data });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message || 'Error al listar personal.' });
    }
};

// 2. Crear Funcionario + Registro en Log
export const crearStaff = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { documento, nombreCompleto, cargo, correo, rol, password } = req.body;

        if (!documento || !nombreCompleto || !cargo || !correo || !rol || !password) {
            res.status(400).json({ success: false, error: 'Todos los campos son obligatorios.' });
            return;
        }

        const { data: idNuevoUsuario, error } = await urnaDb.rpc('crear_usuario_staff', {
            p_documento: documento.trim(),
            p_nombre_completo: nombreCompleto.trim(),
            p_cargo: cargo.trim(),
            p_correo: correo.trim().toLowerCase(),
            p_rol: rol,
            p_password_plana: password,
        });

        if (error) throw error;

        const { ejecutadoPor, ipOrigen, userAgent } = obtenerInfoOperador(req);

        // Registro en Logs
        await urnaDb.from('logs_auditoria_admin').insert({
            accion: 'CREACION_USUARIO_STAFF',
            ejecutado_por: ejecutadoPor,
            ip_origen: ipOrigen,
            user_agent: userAgent,
            detalles: {
                idUsuarioCreado: idNuevoUsuario,
                documento: documento.trim(),
                nombreCompleto: nombreCompleto.trim(),
                cargo: cargo.trim(),
                rolAsignado: rol,
                correo: correo.trim().toLowerCase(),
            },
        });

        res.json({ success: true, idUsuario: idNuevoUsuario });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message || 'Error al registrar funcionario.' });
    }
};

// 3. Activar/Desactivar Funcionario + Registro en Log
export const alternarEstadoStaff = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { idUsuario, activo } = req.body;

        if (!idUsuario || typeof activo !== 'boolean') {
            res.status(400).json({ success: false, error: 'Parámetros inválidos.' });
            return;
        }

        if (req.usuario?.id === idUsuario && !activo) {
            res.status(400).json({ success: false, error: 'No puedes desactivar tu propia cuenta.' });
            return;
        }

        // Obtener datos del usuario modificado para enriquecer el log
        const { data: usrTarget } = await urnaDb
            .from('usuarios_staff')
            .select('documento, nombre_completo, rol')
            .eq('id_usuario', idUsuario)
            .single();

        const { error } = await urnaDb
            .from('usuarios_staff')
            .update({ activo })
            .eq('id_usuario', idUsuario);

        if (error) throw error;

        const { ejecutadoPor, ipOrigen, userAgent } = obtenerInfoOperador(req);

        // Registro en Logs
        await urnaDb.from('logs_auditoria_admin').insert({
            accion: activo ? 'ACTIVACION_USUARIO_STAFF' : 'DESACTIVACION_USUARIO_STAFF',
            ejecutado_por: ejecutadoPor,
            ip_origen: ipOrigen,
            user_agent: userAgent,
            detalles: {
                idUsuarioAfectado: idUsuario,
                documento: usrTarget?.documento,
                nombre: usrTarget?.nombre_completo,
                rol: usrTarget?.rol,
                nuevoEstado: activo ? 'ACTIVO' : 'INACTIVO',
            },
        });

        res.json({ success: true, mensaje: `Usuario ${activo ? 'activado' : 'desactivado'} con éxito.` });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message || 'Error al actualizar estado.' });
    }
};

// 4. Cambiar Contraseña + Registro en Log
export const cambiarPasswordStaff = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { idUsuario, nuevaPassword } = req.body;

        if (!idUsuario || !nuevaPassword) {
            res.status(400).json({ success: false, error: 'ID de usuario y nueva contraseña requeridos.' });
            return;
        }

        // Obtener datos del usuario para el log
        const { data: usrTarget } = await urnaDb
            .from('usuarios_staff')
            .select('documento, nombre_completo, rol')
            .eq('id_usuario', idUsuario)
            .single();

        const { error } = await urnaDb.rpc('cambiar_password_staff', {
            p_id_usuario: idUsuario,
            p_nueva_password: nuevaPassword,
        });

        if (error) throw error;

        const { ejecutadoPor, ipOrigen, userAgent } = obtenerInfoOperador(req);

        // Registro en Logs (sin almacenar contraseñas en plano ni en logs)
        await urnaDb.from('logs_auditoria_admin').insert({
            accion: 'RESTABLECIMIENTO_PASSWORD_STAFF',
            ejecutado_por: ejecutadoPor,
            ip_origen: ipOrigen,
            user_agent: userAgent,
            detalles: {
                idUsuarioAfectado: idUsuario,
                documento: usrTarget?.documento,
                nombre: usrTarget?.nombre_completo,
                rol: usrTarget?.rol,
                motivo: 'Cambio administrativo de clave de acceso',
            },
        });

        res.json({ success: true, mensaje: 'Contraseña actualizada correctamente.' });
    } catch (error: any) {
        res.status(400).json({ success: false, error: error.message || 'Error al cambiar contraseña.' });
    }
};