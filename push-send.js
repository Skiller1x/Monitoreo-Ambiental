// ================================================================
//  FUNCIÓN: push-send
//  Endpoint: /.netlify/functions/push-send
//  Método:   POST
//
//  Recibe un título y mensaje desde el script Python del sensor,
//  lee todas las suscripciones guardadas en Supabase y manda
//  una notificación push a cada una.
//
//  Para evitar que cualquiera pueda mandar notificaciones falsas,
//  el Python debe incluir un header: Authorization: Bearer <PUSH_SECRET>
// ================================================================

const webpush = require('web-push');
const { createClient } = require('@supabase/supabase-js');

// Configurar VAPID con las llaves generadas
webpush.setVapidDetails(
  'mailto:tu@email.com',              // Contacto (requerido por el estándar)
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const db = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event) => {

  // Solo aceptar POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Método no permitido' };
  }

  // Verificar el secreto — solo el Python (que lo conoce) puede llamar esto
  const authHeader = event.headers['authorization'] || '';
  if (authHeader !== `Bearer ${process.env.PUSH_SECRET}`) {
    return { statusCode: 401, body: 'No autorizado' };
  }

  // Leer título y cuerpo del mensaje
  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'JSON inválido' };
  }

  const { titulo, mensaje } = payload;
  if (!titulo || !mensaje) {
    return { statusCode: 400, body: 'Faltan titulo o mensaje' };
  }

  // Leer todas las suscripciones de Supabase
  const { data: suscripciones, error } = await db
    .from('suscripciones')
    .select('endpoint, p256dh, auth');

  if (error) {
    console.error('Error leyendo suscripciones:', error);
    return { statusCode: 500, body: 'Error interno' };
  }

  // Mandar notificación a cada suscriptor en paralelo
  const notificacion = JSON.stringify({ titulo, mensaje });

  const resultados = await Promise.allSettled(
    suscripciones.map(s =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        notificacion
      )
    )
  );

  // Contar éxitos y fallos
  const enviados = resultados.filter(r => r.status === 'fulfilled').length;
  const fallidos = resultados.filter(r => r.status === 'rejected').length;

  console.log(`Notificaciones: ${enviados} enviadas, ${fallidos} fallidas`);

  return {
    statusCode: 200,
    body: JSON.stringify({ enviados, fallidos }),
  };
};
