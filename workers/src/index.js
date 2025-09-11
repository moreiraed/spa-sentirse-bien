import { Router } from 'itty-router';
import admin from 'firebase-admin';
import { error, json } from 'itty-router-extras';

// Helper para inicializar Firebase Admin solo una vez
function initializeFirebaseAdmin(env) {
  if (admin.apps.length === 0) {
    const serviceAccount = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
  return admin.firestore();
}

// --- 1. API Worker ---
// Este router solo se encarga de las rutas /api/*
const apiRouter = Router();

apiRouter.get('/api/services', async (request, env) => {
  try {
    const db = initializeFirebaseAdmin(env);
    const snapshot = await db.collection('services').where('active', '==', true).get();

    if (snapshot.empty) {
      return json([]);
    }

    const services = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return json(services);

  } catch (err) {
    console.error('Error fetching services:', err);
    return error(500, 'Error al obtener los servicios.');
  }
});

apiRouter.post('/api/login', async (request) => {
    // Usamos un try/catch para manejar errores si el body no es JSON válido
    try {
      const { email, password } = await request.json();

      if (!email || !password) {
          return error(400, 'Email y contraseña son requeridos.');
      }

      console.log(`Intento de login para: ${email}`);
      return json({ message: 'Endpoint de login listo para implementar Custom Tokens.' });

    } catch (err) {
      return error(400, 'Cuerpo de la petición inválido.');
    }
});

// Catcher para rutas API no encontradas
apiRouter.all('/api/*', () => error(404, 'Ruta de API no encontrada.'));

// --- 2. El manejador principal (el "aiguilleur") ---
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Si es una ruta de API, se la pasamos al router de la API.
    if (url.pathname.startsWith('/api/')) {
      return apiRouter.handle(request, env, ctx);
    }
    
    // Si no, es una petición para un asset estático (tu SPA).
    // Se la pasamos al manejador de assets de Pages.
    // Este bloque try/catch es crucial para que `wrangler dev` funcione.
    try {
      return env.ASSETS.fetch(request);
    } catch (e) {
      let pathname = url.pathname;
      console.error(`Failed to get asset ${pathname}:`, e);
      return new Response(`Asset ${pathname} no encontrado.`, { status: 404, headers: { 'Content-Type': 'text/plain' } });
    }
  }
};