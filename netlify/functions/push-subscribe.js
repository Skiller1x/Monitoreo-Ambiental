// ================================================================
//  FUNCIÓN: push-subscribe
//  Endpoint: /.netlify/functions/push-subscribe
//  Método:   POST
//
//  Recibe la suscripción push de un usuario (generada por el
//  browser) y la guarda en la tabla `suscripciones` de Supabase.
//  Si el endpoint ya existe (el usuario se suscribió antes),
//  lo ignora silenciosamente gracias al UNIQUE de la tabla.
// ================================================================

const { createClient } = require('@supabase/supabase-js');

const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY   // Llave de servicio, NO la anon
);

exports.handler = async (event) => {

  // Solo aceptar POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Método no permitido' };
  }

  let suscripcion;
  try {
    suscripcion = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'JSON inválido' };
  }

  // El objeto de suscripción que manda el browser tiene esta forma:
  // { endpoint: "https://...", keys: { p256dh: "...", auth: "..." } }
  const { endpoint, keys } = suscripcion;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return { statusCode: 400, body: 'Suscripción incompleta' };
  }

  // Guardar en Supabase — si el endpoint ya existe, no hace nada
  const { error } = await db
    .from('suscripciones')
    .upsert(
      { endpoint, p256dh: keys.p256dh, auth: keys.auth },
      { onConflict: 'endpoint' }
    );

  if (error) {
    console.error('Error guardando suscripción:', error);
    return { statusCode: 500, body: 'Error interno' };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ ok: true }),
  };
};
