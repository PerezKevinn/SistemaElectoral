import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const censoUrl = process.env.SUPABASE_CENSO_URL || '';
const censoKey = process.env.SUPABASE_CENSO_SERVICE_KEY || '';

const urnaUrl = process.env.SUPABASE_URNA_URL || '';
const urnaKey = process.env.SUPABASE_URNA_SERVICE_KEY || '';

if (!censoUrl || !censoKey) {
    throw new Error('Faltan las credenciales de conexión para SUPABASE_CENSO en las variables de entorno.');
}

if (!urnaUrl || !urnaKey) {
    throw new Error('Faltan las credenciales de conexión para SUPABASE_URNA en las variables de entorno.');
}

export const censoDb = createClient(censoUrl, censoKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
    },
});

export const urnaDb = createClient(urnaUrl, urnaKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
    },
});