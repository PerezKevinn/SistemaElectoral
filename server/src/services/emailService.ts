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
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const host = process.env.SMTP_HOST || (user?.includes('@gmail.com') ? 'smtp.gmail.com' : undefined);
    const port = Number(process.env.SMTP_PORT) || 465;
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;

    if (!user || !pass || !host) {
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
        family: 4, // Forzar IPv4 para evitar ENETUNREACH en Render / Docker
        connectionTimeout: 10000,
        greetingTimeout: 5000,
        socketTimeout: 15000,
        tls: {
            rejectUnauthorized: false,
        },
    } as any);
};

/**
 * Genera la plantilla HTML institucional para el correo del votante
 */
const generarPlantillaHTML = (data: VotanteEmailData): string => {
    const appUrl = (process.env.CLIENT_URL || process.env.APP_URL || process.env.FRONTEND_URL || 'https://sistema-electoral-eight.vercel.app/').trim();

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Credenciales de Acceso - Jornada Electoral</title>
</head>
<body style="margin: 0; padding: 32px 16px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);">
    
    <!-- LÍNEA SUPERIOR DE ACENTO INSTITUCIONAL -->
    <tr>
      <td style="height: 5px; background: #0f172a;"></td>
    </tr>

    <!-- ENCABEZADO INSTITUCIONAL -->
    <tr>
      <td style="padding: 32px 32px 24px 32px; border-bottom: 1px solid #f1f5f9;">
        <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px;">
          Jornada Electoral Oficial
        </div>
        <h1 style="margin: 0 0 6px 0; font-size: 20px; font-weight: 700; color: #0f172a; letter-spacing: -0.01em;">
          Credenciales de Sufragio
        </h1>
        <p style="margin: 0; font-size: 13px; color: #64748b; line-height: 1.4;">
          Sistema de Votación y Escrutinio Digital
        </p>
      </td>
    </tr>

    <!-- CUERPO DEL MENSAJE -->
    <tr>
      <td style="padding: 28px 32px;">
        <p style="margin: 0 0 12px 0; font-size: 14px; color: #334155; line-height: 1.5;">
          Estimado(a) <strong>${data.nombreCompleto}</strong>,
        </p>
        <p style="margin: 0 0 24px 0; font-size: 13px; color: #64748b; line-height: 1.5;">
          A continuación se relacionan sus credenciales oficiales para participar en la jornada de votación:
        </p>

        <!-- TABLA EN DOS COLUMNAS: 1. TÍTULO | 2. CREDENCIAL -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; border-collapse: separate; border-spacing: 0; overflow: hidden; margin-bottom: 28px;">
          <thead>
            <tr style="background-color: #f1f5f9;">
              <th align="left" style="padding: 10px 16px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; width: 42%;">
                1. Título
              </th>
              <th align="left" style="padding: 10px 16px; font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; width: 58%;">
                2. Credencial
              </th>
            </tr>
          </thead>
          <tbody>
            <!-- FILA: USUARIO -->
            <tr>
              <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; vertical-align: middle;">
                <span style="font-size: 13px; font-weight: 600; color: #1e293b;">
                  Usuario
                </span>
                <span style="display: block; font-size: 11px; color: #64748b;">
                  Documento de identidad
                </span>
              </td>
              <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; vertical-align: middle;">
                <span style="font-size: 14px; font-weight: 700; color: #0f172a; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">
                  ${data.documento}
                </span>
              </td>
            </tr>

            <!-- FILA: CONTRASEÑA -->
            <tr>
              <td style="padding: 14px 16px; vertical-align: middle;">
                <span style="font-size: 13px; font-weight: 600; color: #1e293b;">
                  Contraseña
                </span>
                <span style="display: block; font-size: 11px; color: #64748b;">
                  Clave de acceso
                </span>
              </td>
              <td style="padding: 14px 16px; vertical-align: middle;">
                <span style="display: inline-block; padding: 4px 10px; background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 15px; font-weight: 700; color: #0f172a; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; letter-spacing: 0.05em;">
                  ${data.passwordPlana}
                </span>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- BOTÓN DE INGRESO -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0 24px 0;">
          <tr>
            <td align="center">
              <a href="${appUrl}" target="_blank" style="display: inline-block; padding: 12px 32px; background-color: #0f172a; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 13px; letter-spacing: 0.01em;">
                Ingresar al Portal de Votación &rarr;
              </a>
            </td>
          </tr>
        </table>

        <p style="margin: 0; font-size: 12px; color: #64748b; text-align: center; line-height: 1.4;">
          Por motivos de seguridad, estas credenciales son personales e intransferibles.
        </p>
      </td>
    </tr>

    <!-- PIE DE PÁGINA -->
    <tr>
      <td style="padding: 16px 32px; text-align: center; background-color: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8;">
        Comisión de Garantías Electorales • Mensaje institucional automático.
      </td>
    </tr>
  </table>
</body>
</html>
    `;
};

/**
 * Envía credenciales privadas al correo del votante.
 * Si no hay SMTP configurado, emula el envío en consola para desarrollo sin romper el flujo.
 */
/**
 * Envía credenciales privadas al correo del votante.
 * Soporta:
 * 1. Resend HTTP API (HTTPS port 443 - recomendado para Render / Vercel)
 * 2. Brevo HTTP API (HTTPS port 443)
 * 3. Nodemailer SMTP (puerto 465/587)
 * 4. Modo Simulación (Sandbox local)
 */
export const enviarCredencialesVotante = async (data: VotanteEmailData): Promise<EmailSendResult> => {
    const htmlContent = generarPlantillaHTML(data);
    const subject = `🗳️ Credenciales de Votación Oficial - Documento ${data.documento}`;
    const fromAddress = process.env.SMTP_FROM || '"Tribunal Electoral" <elecciones@sindicato.org>';

    // --- OPCIÓN 1: RESEND HTTPS API (Inmune a bloqueos de puertos SMTP en Render / Vercel) ---
    if (process.env.RESEND_API_KEY) {
        try {
            const res = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.RESEND_API_KEY.trim()}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    from: process.env.SMTP_FROM || 'Tribunal Electoral <onboarding@resend.dev>',
                    to: [data.correo],
                    subject,
                    html: htmlContent,
                }),
            });

            const resData: any = await res.json();
            if (!res.ok) {
                throw new Error(resData.message || resData.error || 'Error en API de Resend');
            }

            console.log(`✅ [RESEND HTTP API] Correo enviado a ${data.correo} | ID: ${resData.id}`);
            return {
                success: true,
                simulado: false,
                messageId: resData.id,
            };
        } catch (err: any) {
            console.error(`❌ Error en Resend API para ${data.correo}:`, err.message);
            return {
                success: false,
                simulado: false,
                error: `Resend API: ${err.message}`,
            };
        }
    }

    // --- OPCIÓN 2: BREVO HTTPS API (Inmune a bloqueos de puertos SMTP en Render / Vercel) ---
    if (process.env.BREVO_API_KEY) {
        try {
            const res = await fetch('https://api.brevo.com/v3/smtp/email', {
                method: 'POST',
                headers: {
                    'api-key': process.env.BREVO_API_KEY.trim(),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sender: {
                        name: 'Tribunal Electoral Sindicato',
                        email: process.env.SMTP_USER || 'altumsoftware.co@gmail.com',
                    },
                    to: [{ email: data.correo, name: data.nombreCompleto }],
                    subject,
                    htmlContent,
                }),
            });

            const resData: any = await res.json();
            if (!res.ok) {
                throw new Error(resData.message || 'Error en API de Brevo');
            }

            console.log(`✅ [BREVO HTTP API] Correo enviado a ${data.correo} | ID: ${resData.messageId}`);
            return {
                success: true,
                simulado: false,
                messageId: resData.messageId,
            };
        } catch (err: any) {
            console.error(`❌ Error en Brevo API para ${data.correo}:`, err.message);
            return {
                success: false,
                simulado: false,
                error: `Brevo API: ${err.message}`,
            };
        }
    }

    // --- OPCIÓN 3: NODEMAILER SMTP SOCKETS ---
    const transporter = crearTransporter();

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
            subject,
            html: htmlContent,
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
 * Diagnóstico del estado del servidor de correos (Resend / Brevo / SMTP)
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
    // 1. Resend API (HTTPS port 443)
    if (process.env.RESEND_API_KEY) {
        return {
            configurado: true,
            modo: 'REAL',
            host: 'api.resend.com (HTTPS REST)',
            remitente: process.env.SMTP_FROM || 'onboarding@resend.dev',
            mensaje: 'Servicio de correo activo vía Resend HTTPS API (Inmune a bloqueos de puertos en la nube).',
        };
    }

    // 2. Brevo API (HTTPS port 443)
    if (process.env.BREVO_API_KEY) {
        return {
            configurado: true,
            modo: 'REAL',
            host: 'api.brevo.com (HTTPS REST)',
            remitente: process.env.SMTP_USER || 'Brevo API',
            mensaje: 'Servicio de correo activo vía Brevo HTTPS API.',
        };
    }

    // 3. SMTP Sockets
    const host = process.env.SMTP_HOST || (process.env.SMTP_USER?.includes('@gmail.com') ? 'smtp.gmail.com' : undefined);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!user || !pass) {
        return {
            configurado: false,
            modo: 'SIMULACION',
            mensaje: 'Servidor de correo no configurado. Las claves se guardan en BD pero no se envían a bandejas reales.',
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
            puerto: Number(process.env.SMTP_PORT) || 465,
            remitente: process.env.SMTP_FROM || user,
            mensaje: `Conexión SMTP activa con ${host}. Los correos se envían a las bandejas reales.`,
        };
    } catch (err: any) {
        return {
            configurado: false,
            modo: 'SIMULACION',
            host,
            mensaje: `Fallo al verificar SMTP (${err.message}). Si estás en Render Free, los puertos SMTP de salida están bloqueados; recomendamos usar RESEND_API_KEY vía HTTPS.`,
            error: err.message,
        };
    }
};
