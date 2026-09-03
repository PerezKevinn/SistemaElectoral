import cors from 'cors';
import dotenv from 'dotenv';
import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import authRoutes from './routes/authRoutes';
import urnaRoutes from './routes/urnaRoutes';
import { apiGlobalLimiter } from './middleware/security';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// 1. Cabeceras HTTP de Seguridad con Helmet
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
                fontSrc: ["'self'", 'https://fonts.gstatic.com'],
                imgSrc: ["'self'", 'data:', 'https:'],
                connectSrc: ["'self'", 'https://*.supabase.co', 'http://localhost:*', 'http://127.0.0.1:*', 'https://*.vercel.app', 'https://*.onrender.com'],
            },
        },
        crossOriginEmbedderPolicy: false,
        hidePoweredBy: true, // Oculta "X-Powered-By: Express"
    })
);

// 2. Configuración de CORS con lista de orígenes permitidos
const origenesPermitidos = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:4000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:4000',
    process.env.CLIENT_URL,
].filter(Boolean);

app.use(
    cors({
        origin: (origin, callback) => {
            // Permitir peticiones sin origen (como Postman, mobile o server-to-server)
            if (!origin) return callback(null, true);

            const esVercel = /^https:\/\/[a-zA-Z0-9\-_.]+\.vercel\.app$/.test(origin);
            const esLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
            const esPermitido = origenesPermitidos.some(o => o && origin.startsWith(o));

            if (esLocalhost || esVercel || esPermitido || process.env.NODE_ENV !== 'production') {
                return callback(null, true);
            }
            return callback(new Error(`Bloqueado por política CORS: ${origin}`));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    })
);

// 3. Límites de tamaño de payload y parsing seguro
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

import { checkHealth } from './controllers/healthController';

// 4. Rate Limiting Global
app.use('/api', apiGlobalLimiter);

// 5. Montaje de rutas de API
app.get('/api/health', checkHealth);
app.use('/api/auth', authRoutes);
app.use('/api/urna', urnaRoutes);

// 6. Manejador de rutas inexistentes (404 seguro)
app.use((req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        error: 'Recurso no encontrado en la API del Tribunal Electoral.',
    });
});

// 7. Manejador Global de Errores (Evita fuga de información y stack traces)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('⚠️ [ERROR NO CONTROLADO]:', err.message || err);
    res.status(err.status || 500).json({
        success: false,
        error: process.env.NODE_ENV === 'production'
            ? 'Ha ocurrido un error interno en el sistema electoral.'
            : err.message || 'Error interno del servidor.',
    });
});

app.listen(PORT, () => {
    console.log(`🛡️ Servidor Blindado de Elecciones activo en el puerto ${PORT}`);
});