import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Cliente Censo (Acceso a votantes y estado de token)
export const censoDb = createClient(
    process.env.CENSO_SUPABASE_URL!,
    process.env.CENSO_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
);

// Cliente Urna (Acceso a tokens ciegos, elecciones, candidatos y votos)
export const urnaDb = createClient(
    process.env.URNA_SUPABASE_URL!,
    process.env.URNA_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
);