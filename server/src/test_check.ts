import { urnaDb } from './config/supabase';

async function main() {
  const eleccionId = 'b84ce4ef-9e3b-4dea-9f40-1a328ce6f83d';

  const { data: escrutinio, error: errEsc } = await urnaDb.rpc('obtener_escrutinio', {
    p_eleccion_id: eleccionId
  });
  console.log('ESCRUTINIO:', JSON.stringify(escrutinio, null, 2), 'ERROR:', errEsc);

  const { data: eleccion, error: errEleccion } = await urnaDb
    .from('elecciones')
    .select('id_eleccion, titulo, descripcion, estado, creado_at')
    .eq('id_eleccion', eleccionId)
    .single();
  console.log('ELECCION:', eleccion, 'ERROR:', errEleccion);

  const { data: primerVoto } = await urnaDb
    .from('votos')
    .select('voto_hash, prev_hash')
    .eq('id_eleccion', eleccionId)
    .order('secuencia_conteo', { ascending: true })
    .limit(1)
    .maybeSingle();

  const { data: ultimoVoto } = await urnaDb
    .from('votos')
    .select('voto_hash, secuencia_conteo')
    .eq('id_eleccion', eleccionId)
    .order('secuencia_conteo', { ascending: false })
    .limit(1)
    .maybeSingle();

  console.log('PRIMER VOTO:', primerVoto);
  console.log('ULTIMO VOTO:', ultimoVoto);

  process.exit(0);
}

main();
