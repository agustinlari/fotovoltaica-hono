import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { z } from 'zod';
import { db } from './db/client';
import { camiones, estructura, pallets, paneles } from './db/schema';
import { and, eq } from 'drizzle-orm';
import { keycloakAuthRoutes } from './helpers/keycloak-auth.helper';
import { PORT } from './config/env';

const app = new Hono();

// Configuración CORS más específica
app.use('*', cors({
  origin: (origin) => {
    // Para peticiones sin origin (como curl o Postman)
    if (!origin) return '*';
    
    // Lista específica de orígenes permitidos
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:5175', // Puerto del frontend fotovoltaica
      'http://localhost:3000', 
      'http://localhost:4173',
      'http://localhost:5174'
    ];
    
    // Si el origin está en la lista permitida, devolverlo
    if (allowedOrigins.includes(origin)) {
      return origin;
    }
    
    // Permitir cualquier localhost en desarrollo
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return origin;
    }
    
    // Rechazar otros orígenes
    return false;
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposeHeaders: ['Content-Type', 'Authorization']
}));

// Middleware específico para peticiones OPTIONS
app.options('*', (c) => {
  return c.text('', 204);
});

// Rutas de autenticación
app.route('/', keycloakAuthRoutes);

app.get('/health', (c) => c.json({ ok: true }));

// Camiones
app.get('/camiones', async (c) => {
  const rows = await db.select().from(camiones).orderBy(camiones.id);
  return c.json(rows);
});
app.get('/camiones/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const [row] = await db.select().from(camiones).where(eq(camiones.id, id));
  if (!row) return c.notFound();
  return c.json(row);
});
app.post('/camiones', async (c) => {
  const body = await c.req.json();
  const [newCamion] = await db.insert(camiones).values(body).returning();
  return c.json(newCamion, 201);
});
app.put('/camiones/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const body = await c.req.json();
  await db.update(camiones).set(body).where(eq(camiones.id, id));
  return c.json({ ok: true });
});
app.delete('/camiones/:id', async (c) => {
  const id = Number(c.req.param('id'));
  await db.delete(camiones).where(eq(camiones.id, id));
  return c.json({ ok: true });
});

// Estructura
app.get('/estructura', async (c) => {
  const rows = await db.select().from(estructura).orderBy(estructura.id);
  return c.json(rows);
});
app.get('/estructura/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const [row] = await db.select().from(estructura).where(eq(estructura.id, id));
  if (!row) return c.notFound();
  return c.json(row);
});
app.post('/estructura', async (c) => {
  const body = await c.req.json();
  const [newEstructura] = await db.insert(estructura).values(body).returning();
  return c.json(newEstructura, 201);
});
app.put('/estructura/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const body = await c.req.json();
  await db.update(estructura).set(body).where(eq(estructura.id, id));
  return c.json({ ok: true });
});
app.delete('/estructura/:id', async (c) => {
  const id = Number(c.req.param('id'));
  await db.delete(estructura).where(eq(estructura.id, id));
  return c.json({ ok: true });
});

// Pallets
app.get('/pallets', async (c) => {
  const rows = await db.select().from(pallets).orderBy(pallets.id);
  return c.json(rows);
});
app.get('/pallets/:id', async (c) => {
  const id = c.req.param('id');
  const [row] = await db.select().from(pallets).where(eq(pallets.id, id));
  if (!row) return c.notFound();
  return c.json(row);
});
app.post('/pallets', async (c) => {
  const body = await c.req.json();
  const [newPallet] = await db.insert(pallets).values(body).returning();
  return c.json(newPallet, 201);
});
app.put('/pallets/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  await db.update(pallets).set(body).where(eq(pallets.id, id));
  return c.json({ ok: true });
});
app.delete('/pallets/:id', async (c) => {
  const id = c.req.param('id');
  await db.delete(pallets).where(eq(pallets.id, id));
  return c.json({ ok: true });
});

// Paneles (básico)
app.get('/paneles/:sn', async (c) => {
  const sn = c.req.param('sn');
  const [row] = await db.select().from(paneles).where(eq(paneles.SN, sn));
  if (!row) return c.notFound();
  return c.json(row);
});

const port = Number(PORT);
serve({ fetch: app.fetch, port });
console.log(`Hono server running on http://localhost:${port}`);


