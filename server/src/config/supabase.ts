import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const censoUrl = process.env.SUPABASE_CENSO_URL || process.env.CENSO_SUPABASE_URL || '';
const censoKey = process.env.SUPABASE_CENSO_SERVICE_KEY || process.env.CENSO_SERVICE_ROLE_KEY || process.env.CENSO_SUPABASE_KEY || '';

const urnaUrl = process.env.SUPABASE_URNA_URL || process.env.URNA_SUPABASE_URL || '';
const urnaKey = process.env.SUPABASE_URNA_SERVICE_KEY || process.env.URNA_SERVICE_ROLE_KEY || process.env.URNA_SUPABASE_KEY || '';

if (!censoUrl || !censoKey) {
    throw new Error('Faltan las credenciales de conexión para CENSO_SUPABASE_URL / CENSO_SERVICE_ROLE_KEY en las variables de entorno.');
}

if (!urnaUrl || !urnaKey) {
    throw new Error('Faltan las credenciales de conexión para URNA_SUPABASE_URL / URNA_SERVICE_ROLE_KEY en las variables de entorno.');
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