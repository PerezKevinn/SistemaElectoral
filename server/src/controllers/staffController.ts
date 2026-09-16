import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { censoDb, urnaDb } from '../config/supabase';
import { AuthRequest } from '../middleware/authRole';
import { validarDocumento, validarPasswordFuerte, validarUUID } from '../middleware/security';

const getJwtSecret = (): string => {
    const secret = process.env.JWT_CHALLENGE_SECRET || process.env.JWT_SECRET;
    if (!secret || secret.length < 16) {
        throw new Error('Se requiere JWT_CHALLENGE_SECRET robusto.');
    }
    return secret;
};

// Helper para registrar auditoría de staff
const registrarAuditoriaStaff = async (accion: string, ejecutadoPor: string, req: Request, detalles: any) => {
    try {
        const ip = req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1';
        const userAgent = (req.headers['user-agent'] as string) || 'Desconocido';
        await urnaDb.from('logs_auditoria_admin').insert({
            accion,
            ejecutado_por: ejecutadoPor,
            ip_origen: ip,
            user_agent: userAgent,
            detalles,
        });
    } catch (err) {
        console.error('Error registrando log de auditoría:', err);
    }
};

// 1. Login de Funcionarios (Personal Electoral)
export const loginStaff = async (req: Request, res: Response): Promise<void> => {
    try {
        const documentoRaw = (req.body.documento || req.body.documentoIdentidad || req.body.cedula || '');
        const passwordRaw = (req.body.clave || req.body.password || req.body.contrasena || '');

        const documento = validarDocumento(documentoRaw);
        const password = String(passwordRaw).trim();

        if (!password) {
            res.status(400).json({ success: false, error: 'Documento y contraseña requeridos.' });
            return;
        }

        const rolSolicitado = req.body.rol ? String(req.body.rol).trim().toUpperCase() : null;

        // A. AUTENTICACIÓN PRIORITARIA DE SUPER ADMINISTRADOR (IN-MEMORY / SIN TABLA DE STAFF)
        const superAdminDoc = (process.env.SUPER_ADMIN_DOCUMENTO || 'superadmin').trim();
        const superAdminPass = (process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin2026!#').trim();
        const superAdminHash = process.env.SUPER_ADMIN_PASSWORD_HASH;
        const superAdminNombre = process.env.SUPER_ADMIN_NOMBRE || 'Super Administrador Principal';
        const superAdminCargo = process.env.SUPER_ADMIN_CARGO || 'Administrador General de Infraestructura';

        if (documento.toLowerCase() === superAdminDoc.toLowerCase()) {
            let passwordValida = false;
            if (superAdminHash) {
                passwordValida = await bcrypt.compare(password, superAdminHash);
            } else {
                passwordValida = (password === superAdminPass);
            }

            if (!passwordValida) {
                res.status(401).json({ success: false, error: 'Credenciales de Super Administrador incorrectas.' });
                return;
            }

            if (rolSolicitado && rolSolicitado !== 'ADMIN') {
                res.status(401).json({ success: false, error: 'El Super Administrador tiene asignado el perfil institucional ADMIN.' });
                return;
            }

            const token = jwt.sign(
                {
                    id: 'SUPER_ADMIN_ROOT',
                    documento: superAdminDoc,
                    nombre: superAdminNombre,
                    cargo: superAdminCargo,
                    rol: 'ADMIN',
                    esSuperAdmin: true,
                },
                getJwtSecret(),
                { expiresIn: '8h', algorithm: 'HS256' }
            );

            await registrarAuditoriaStaff('LOGIN_SUPER_ADMIN', `SUPER_ADMIN_${superAdminDoc}`, req, {
                documento: superAdminDoc,
                nombre: superAdminNombre,
                cargo: superAdminCargo,
                rol: 'ADMIN',
            });

            res.json({
                success: true,
                token,
                usuario: {
                    id: 'SUPER_ADMIN_ROOT',
                    documento: superAdminDoc,
                    nombre: superAdminNombre,
                    cargo: superAdminCargo,
                    rol: 'ADMIN',
                    esSuperAdmin: true,
                },
            });
            return;
        }

        // B. AUTENTICACIÓN ESTÁNDAR DE PERSONAL ELECTORAL EN BASE DE DATOS
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

        if (rolSolicitado && funcionario.rol !== rolSolicitado) {
            res.status(401).json({ success: false, error: 'Credenciales institucionales incorrectas o no autorizadas.' });
            return;
        }

        const passwordValida = await bcrypt.compare(password, funcionario.password_hash);
        if (!passwordValida) {
            res.status(401).json({ success: false, error: 'Credenciales institucionales incorrectas o no autorizadas.' });
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
        console.error('⚠️ [SEGURIDAD] Error en loginStaff:', err.message);
        res.status(err.message?.includes('formato') ? 400 : 500).json({
            success: false,
            error: err.message?.includes('formato') ? err.message : 'Error en la autenticación de funcionario.',
        });
    }
};

// 2. Listar Funcionarios (Solo Administradores)
export const listarStaff = async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { data, error } = await censoDb
            .from('personal_electoral')
            .select('id, documento_identidad, nombres, apellidos, cargo, rol, esta_activo, created_at')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ success: true, data: data || [] });
    } catch (err: any) {
        console.error('Error al listar staff:', err);
        res.status(500).json({ success: false, error: 'Error al consultar la lista de personal electoral.' });
    }
};

// 3. Crear Funcionario (Solo Administradores)
export const crearStaff = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { documento_identidad, nombres, apellidos, cargo, rol, password } = req.body;

        if (!documento_identidad || !nombres || !apellidos || !cargo || !rol || !password) {
            res.status(400).json({ success: false, error: 'Todos los campos institucionales son obligatorios.' });
            return;
        }

        const docLimpio = validarDocumento(documento_identidad);
        const passLimpia = validarPasswordFuerte(password);

        const rolNormalizado = rol.toString().toUpperCase().trim();
        if (rolNormalizado === 'ADMIN') {
            res.status(403).json({ success: false, error: 'Por motivos de seguridad, no está permitido registrar nuevos usuarios con rol ADMIN.' });
            return;
        }

        if (rolNormalizado !== 'AUDITOR') {
            res.status(400).json({ success: false, error: 'El rol asignado debe ser AUDITOR.' });
            return;
        }

        const password_hash = await bcrypt.hash(passLimpia, 10);

        const { data, error } = await censoDb
            .from('personal_electoral')
            .insert([
                {
                    documento_identidad: docLimpio,
                    nombres: String(nombres).trim(),
                    apellidos: String(apellidos).trim(),
                    cargo: String(cargo).trim(),
                    rol: rolNormalizado,
                    password_hash,
                    esta_activo: true,
                },
            ])
            .select('id, documento_identidad, nombres, apellidos, cargo, rol, esta_activo')
            .single();

        if (error) {
            if (error.code === '23505') {
                res.status(400).json({ success: false, error: 'Ya existe un funcionario registrado con este documento.' });
                return;
            }
            throw error;
        }

        // Registrar en bitácora de auditoría
        await registrarAuditoriaStaff(
            'CREACION_USUARIO_STAFF',
            req.usuario?.nombre || 'ADMIN_OFICIAL',
            req,
            { funcionario_creado: `${nombres} ${apellidos}`, rol: rolNormalizado, documento: docLimpio }
        );

        res.json({ success: true, data });
    } catch (err: any) {
        console.error('Error al crear staff:', err);
        res.status(err.message?.includes('contraseña') || err.message?.includes('documento') ? 400 : 500).json({
            success: false,
            error: err.message || 'Error al registrar el funcionario electoral.',
        });
    }
};

// 4. Alternar Estado Activo / Inactivo
export const alternarEstadoStaff = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const idRaw = req.body.idUsuario || req.body.id;
        const esta_activo = req.body.activo !== undefined ? req.body.activo : req.body.esta_activo;

        const id = validarUUID(idRaw, 'ID de funcionario');

        // Evitar que un administrador se desactive a sí mismo
        if (req.usuario?.id === id && esta_activo === false) {
            res.status(400).json({
                success: false,
                error: 'Seguridad institucional: No puedes desactivar tu propia cuenta activa de administrador.',
            });
            return;
        }

        const { data, error } = await censoDb
            .from('personal_electoral')
            .update({ esta_activo })
            .eq('id', id)
            .select('id, documento_identidad, nombres, apellidos, rol, esta_activo')
            .single();

        if (error || !data) throw error || new Error('Funcionario no encontrado');

        await registrarAuditoriaStaff(
            esta_activo ? 'ACTIVACION_USUARIO_STAFF' : 'DESACTIVACION_USUARIO_STAFF',
            req.usuario?.nombre || 'ADMIN_OFICIAL',
            req,
            { funcionario_afectado: `${data.nombres} ${data.apellidos}`, nuevo_estado: esta_activo ? 'ACTIVO' : 'INACTIVO' }
        );

        res.json({ success: true, data });
    } catch (err: any) {
        console.error('Error al modificar estado staff:', err);
        res.status(500).json({ success: false, error: err.message || 'Error al modificar el estado del funcionario.' });
    }
};

// 5. Restablecer Contraseña de Funcionario
export const cambiarPasswordStaff = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const idRaw = req.body.idUsuario || req.body.id;
        const passwordRaw = req.body.nuevaPassword || req.body.password;

        const id = validarUUID(idRaw, 'ID de funcionario');
        const passLimpia = validarPasswordFuerte(passwordRaw);

        const password_hash = await bcrypt.hash(passLimpia, 10);

        const { data, error } = await censoDb
            .from('personal_electoral')
            .update({ password_hash })
            .eq('id', id)
            .select('id, nombres, apellidos, documento_identidad')
            .single();

        if (error || !data) throw error || new Error('Funcionario no encontrado');

        await registrarAuditoriaStaff(
            'RESTABLECIMIENTO_PASSWORD_STAFF',
            req.usuario?.nombre || 'ADMIN_OFICIAL',
            req,
            { funcionario: `${data.nombres} ${data.apellidos}`, documento: data.documento_identidad }
        );

        res.json({ success: true, message: 'Contraseña actualizada exitosamente con cifrado seguro.' });
    } catch (err: any) {
        console.error('Error al cambiar contraseña staff:', err);
        res.status(err.message?.includes('contraseña') ? 400 : 500).json({
            success: false,
            error: err.message || 'Error al actualizar la contraseña del funcionario.',
        });
    }
};

/**
 * 6. Eliminar Funcionario / Staff Electoral (Solo ADMIN)
 * Protege contra auto-eliminación del administrador activo y asienta auditoría inmutable
 */
export const eliminarStaff = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const idRaw = req.body.idUsuario || req.body.id || req.params.id;
        const motivo = (req.body.motivo || 'Eliminación administrativa de funcionario electoral').toString().trim();

        const id = validarUUID(idRaw, 'ID de funcionario');

        // Seguridad: Evitar que un administrador se elimine a sí mismo
        if (req.usuario?.id === id) {
            res.status(400).json({
                success: false,
                error: 'Seguridad institucional: No puedes eliminar tu propia cuenta activa de administrador.',
            });
            return;
        }

        // Obtener datos completos del staff antes de eliminar
        const { data: staff, error: queryError } = await censoDb
            .from('personal_electoral')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (queryError || !staff) {
            res.status(404).json({ success: false, error: 'Funcionario no encontrado.' });
            return;
        }

        // Eliminar de la base de datos
        const { error: deleteError } = await censoDb
            .from('personal_electoral')
            .delete()
            .eq('id', id);

        if (deleteError) throw deleteError;

        // Registrar exhaustivamente en la bitácora de auditoría
        const adminNombre = req.usuario?.nombre || 'ADMIN_OFICIAL';
        const adminRol = req.usuario?.rol || 'ADMIN';

        await registrarAuditoriaStaff(
            'ELIMINACION_USUARIO_STAFF',
            `${adminRol}_${adminNombre}`,
            req,
            {
                id_staff_eliminado: staff.id,
                documento_identidad: staff.documento_identidad,
                nombre_completo: `${staff.nombres} ${staff.apellidos}`.trim(),
                cargo: staff.cargo,
                rol: staff.rol,
                estado_previo: staff.esta_activo ? 'ACTIVO' : 'INACTIVO',
                motivo_eliminacion: motivo,
                eliminado_por: adminNombre,
                rol_ejecutor: adminRol,
                fecha_creacion_original: staff.created_at,
            }
        );

        res.json({
            success: true,
            mensaje: `Funcionario ${staff.nombres} ${staff.apellidos} (${staff.cargo} - ${staff.rol}) eliminado exitosamente. Registro asentado en bitácora de auditoría.`,
            staffEliminado: {
                id: staff.id,
                documento_identidad: staff.documento_identidad,
                nombre: `${staff.nombres} ${staff.apellidos}`.trim(),
                rol: staff.rol,
            },
        });
    } catch (err: any) {
        console.error('Error al eliminar staff:', err);
        res.status(500).json({
            success: false,
            error: err.message || 'Error al eliminar funcionario electoral.',
        });
    }
};