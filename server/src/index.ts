import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import authRoutes from './routes/authRoutes';
import urnaRoutes from './routes/urnaRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Configuración de CORS permitiendo orígenes cruzados (Vercel -> Render)
app.use(
    cors({
        origin: '*',
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Montaje de rutas de API
app.use('/api/auth', authRoutes);
app.use('/api/urna', urnaRoutes);

app.listen(PORT, () => {
    console.log(`🛡️ Servidor de Elecciones activo en el puerto ${PORT}`);
});