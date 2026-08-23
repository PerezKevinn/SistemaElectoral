import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import urnaRoutes from './routes/urnaRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Montaje de rutas de API
app.use('/api/auth', authRoutes);
app.use('/api/urna', urnaRoutes);

app.listen(PORT, () => {
    console.log(`🛡️ Servidor de Elecciones activo en http://localhost:${PORT}`);
});