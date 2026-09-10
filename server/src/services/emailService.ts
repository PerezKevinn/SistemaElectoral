import nodemailer from 'nodemailer';

export interface VotanteEmailData {
    documento: string;
    nombreCompleto: string;
    correo: string;
    passwordPlana: string;
    subdirectiva?: string;
    telefono?: string;
}

export interface EmailSendResult {
    success: boolean;
    simulado: boolean;
    messageId?: string;
    error?: string;
}

// Configuración del transportador SMTP
const crearTransporter = () => {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;

    if (!host || !user || !pass) {
        return null;
    }

    return nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
            user,
            pass,
        },
        tls: {
            rejectUnauthorized: process.env.NODE_ENV === 'production',
        },
    });
};

/**
 * Genera la plantilla HTML institucional para el correo del votante
 */
const generarPlantillaHTML = (data: VotanteEmailData): string => {
    const appUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const subdirectivaTexto = data.subdirectiva ? data.subdirectiva : 'Padrón General Nacional';

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Credenciales de Votación Institucional</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #030712; color: #f8fafc; margin: 0; padding: 20px; }
    .container { max-width: 580px; margin: 0 auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5); }
    .header { background: linear-gradient(135deg, #1e1b4b, #0f172a); padding: 32px 24px; text-align: center; border-bottom: 1px solid #312e81; }
    .badge { display: inline-block; padding: 4px 12px; background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 9999px; font-size: 11px; font-weight: 700; color: #818cf8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; }
    .title { font-size: 20px; font-weight: 800; color: #ffffff; margin: 0 0 6px 0; }
    .subtitle { font-size: 12px; color: #94a3b8; margin: 0; }
    .content { padding: 28px 24px; line-height: 1.6; }
    .greeting { font-size: 14px; color: #e2e8f0; margin-bottom: 16px; }
    .info-card { background: #030712; border: 1px solid #334155; border-radius: 12px; padding: 20px; margin: 20px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #1e293b; font-size: 13px; }
    .info-row:last-child { border-bottom: none; }
    .info-label { color: #94a3b8; font-weight: 500; }
    .info-value { color: #ffffff; font-weight: 700; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .pass-box { background: rgba(16, 185, 129, 0.1); border: 1px dashed rgba(16, 185, 129, 0.4); border-radius: 10px; padding: 14px; text-align: center; margin: 20px 0; }
    .pass-label { font-size: 11px; color: #6ee7b7; text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em; display: block; margin-bottom: 4px; }
    .pass-code { font-size: 22px; font-weight: 800; color: #10b981; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; letter-spacing: 0.1em; }
    .btn-container { text-align: center; margin: 28px 0 20px 0; }
    .btn { display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #059669, #047857); color: #ffffff !important; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 14px; box-shadow: 0 10px 15px -3px rgba(5, 150, 105, 0.4); }
    .warning { background: rgba(245, 158, 11, 0.08); border-left: 3px solid #f59e0b; padding: 12px 14px; font-size: 12px; color: #fde68a; border-radius: 0 8px 8px 0; margin-top: 24px; }
    .footer { background: #030712; padding: 20px 24px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #1e293b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">Tribunal Electoral Autónomo</div>
      <h1 class="title">Credenciales Oficiales de Sufragio</h1>
      <p class="subtitle">Sistema Autónomo de Votación y Escrutinio Digital</p>
    </div>

    <div class="content">
      <p class="greeting">Estimado(a) <strong>${data.nombreCompleto}</strong>,</p>
      <p style="font-size: 13px; color: #cbd5e1; margin-bottom: 16px;">
        Se ha habilitado satisfactoriamente su registro en el censo electoral oficial para la jornada de votación sindical.
      </p>

      <div class="info-card">
        <div class="info-row">
          <span class="info-label">Documento / Cédula:</span>
          <span class="info-value">${data.documento}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Subdirectiva / Seccional:</span>
          <span class="info-value" style="font-family: inherit; font-size: 12px; color: #e0e7ff;">${subdirectivaTexto}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Correo Registrado:</span>
          <span class="info-value" style="font-family: inherit; font-size: 12px; color: #94a3b8;">${data.correo}</span>
        </div>
      </div>

      <div class="pass-box">
        <span class="pass-label">Contraseña Temporal de Acceso</span>
        <span class="pass-code">${data.passwordPlana}</span>
      </div>

      <div class="btn-container">
        <a href="${appUrl}" class="btn" target="_blank">Ingresar al Portal de Votación &rarr;</a>
      </div>

      <div class="warning">
        <strong>Medidas de Seguridad y Secreto de Voto:</strong><br>
        1. Esta clave es personal e intransferible. El personal administrativo nunca tuvo acceso a su contraseña.<br>
        2. Al ingresar al sistema, se solicitará escanear su código <strong>MFA / 2FA</strong> para emitir su token ciego de sufragio.<br>
        3. Su voto está blindado matemáticamente y no puede ser asociado a su identidad.
      </div>
    </div>

    <div class="footer">
      Comisión Electoral y de Garantías • Este es un mensaje automático institucional, por favor no responda a este correo.
    </div>
  </div>
</body>
</html>
    `;
};

/**
 * Envía credenciales privadas al correo del votante.
 * Si no hay SMTP configurado, emula el envío en consola para desarrollo sin romper el flujo.
 */
export const enviarCredencialesVotante = async (data: VotanteEmailData): Promise<EmailSendResult> => {
    const transporter = crearTransporter();
    const fromAddress = process.env.SMTP_FROM || '"Tribunal Electoral" <elecciones@sindicato.org>';

    if (!transporter) {
        // Modo Sandbox / Simulación local
        console.log(`[EMAIL SIMULADO] Enviar credencial a ${data.correo} | Doc: ${data.documento} | Subdirectiva: ${data.subdirectiva || 'General'}`);
        return {
            success: true,
            simulado: true,
            messageId: `sim-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        };
    }

    try {
        const info = await transporter.sendMail({
            from: fromAddress,
            to: data.correo,
            subject: `🗳️ Credenciales de Votación Oficial - Documento ${data.documento}`,
            html: generarPlantillaHTML(data),
        });

        return {
            success: true,
            simulado: false,
            messageId: info.messageId,
        };
    } catch (err: any) {
        console.error(`❌ Error enviando correo a ${data.correo}:`, err.message);
        return {
            success: false,
            simulado: false,
            error: err.message || 'Fallo en servidor SMTP',
        };
    }
};

/**
 * Diagnóstico del estado del servidor de correos SMTP
 */
export const verificarEstadoSmtp = async (): Promise<{
    configurado: boolean;
    modo: 'REAL' | 'SIMULACION';
    host?: string;
    puerto?: number;
    remitente?: string;
    mensaje: string;
    error?: string;
}> => {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
        return {
            configurado: false,
            modo: 'SIMULACION',
            mensaje: 'Servidor SMTP no configurado en variables de entorno (.env). Los correos se simulan internamente.',
        };
    }

    const transporter = crearTransporter();
    if (!transporter) {
        return {
            configurado: false,
            modo: 'SIMULACION',
            mensaje: 'No se pudo inicializar la conexión SMTP.',
        };
    }

    try {
        await transporter.verify();
        return {
            configurado: true,
            modo: 'REAL',
            host,
            puerto: Number(process.env.SMTP_PORT) || 587,
            remitente: process.env.SMTP_FROM || user,
            mensaje: `Conexión SMTP activa con ${host}. Los correos se envían a las bandejas reales.`,
        };
    } catch (err: any) {
        return {
            configurado: false,
            modo: 'SIMULACION',
            host,
            mensaje: `Fallo al verificar credenciales SMTP (${err.message}).`,
            error: err.message,
        };
    }
};
