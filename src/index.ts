import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import { z } from 'zod';
import { db } from './db/client.js';
import { camiones, estructura, pallets, paneles, archivos, usuarios } from './db/schema.js';
import { and, eq } from 'drizzle-orm';
import { keycloakAuthRoutes } from './helpers/keycloak-auth.helper.js';
import { getUserIdFromRequest } from './helpers/keycloak.helper.js';
import { PORT } from './config/env.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import { fileURLToPath } from 'url';

// Helper para ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = new Hono();

// Configuración CORS más específica
app.use('*', cors({
  origin: (origin, c) => {
    // Para peticiones sin origin (como curl o Postman)
    if (!origin) return '*';
    
    // Lista específica de orígenes permitidos
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:5175', // Puerto del frontend fotovoltaica
      'http://localhost:3000', 
      'http://localhost:4173',
      'http://localhost:5174',
      'https://aplicaciones.osmos.es:4444' // Producción
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
    return null;
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposeHeaders: ['Content-Type', 'Authorization']
}));

// Middleware específico para peticiones OPTIONS
app.options('*', (c) => {
  return new Response('', { status: 204 });
});

// Rutas de autenticación
app.route('/', keycloakAuthRoutes);

app.get('/health', (c) => c.json({ ok: true }));

// Usuarios
app.get('/usuarios/:keycloakId', async (c) => {
  const keycloakId = c.req.param('keycloakId');
  const [usuario] = await db.select().from(usuarios).where(eq(usuarios.keycloak_id, keycloakId));
  if (!usuario) return c.notFound();
  return c.json(usuario);
});

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
  
  // Obtener usuario actual
  const userId = await getUserIdFromRequest(c.req.header('Authorization'));
  
  // Convertir fechas ISO string a Date si es necesario
  const dateFields = ['FechaDescarga', 'updated_at', 'created_at'];
  dateFields.forEach(field => {
    if (body[field] && typeof body[field] === 'string') {
      body[field] = new Date(body[field]);
    }
  });
  
  // Agregar información de auditoría
  const dataToInsert = {
    ...body,
    updated_at: new Date(),
    updated_by: userId
  };
  
  const [newCamion] = await db.insert(camiones).values(dataToInsert).returning();
  return c.json(newCamion, 201);
});
app.put('/camiones/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const body = await c.req.json();
  
  // Obtener usuario actual
  const userId = await getUserIdFromRequest(c.req.header('Authorization'));
  
  // Convertir fechas ISO string a Date si es necesario
  const dateFields = ['FechaDescarga', 'updated_at', 'created_at'];
  dateFields.forEach(field => {
    if (body[field] && typeof body[field] === 'string') {
      body[field] = new Date(body[field]);
    }
  });
  
  // Agregar información de auditoría
  const dataToUpdate = {
    ...body,
    updated_at: new Date(),
    updated_by: userId
  };
  
  await db.update(camiones).set(dataToUpdate).where(eq(camiones.id, id));
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
  
  // Obtener usuario actual
  const userId = await getUserIdFromRequest(c.req.header('Authorization'));
  
  // Convertir fechas ISO string a Date si es necesario
  const dateFields = ['FechaDescarga', 'modified_at', 'created_at'];
  dateFields.forEach(field => {
    if (body[field] && typeof body[field] === 'string') {
      body[field] = new Date(body[field]);
    }
  });
  
  // Agregar información de auditoría
  const dataToInsert = {
    ...body,
    modified_at: new Date(),
    modified_by: userId
  };
  
  const [newEstructura] = await db.insert(estructura).values(dataToInsert).returning();
  return c.json(newEstructura, 201);
});
app.put('/estructura/:id', async (c) => {
  const id = Number(c.req.param('id'));
  const body = await c.req.json();
  
  // Obtener usuario actual
  const userId = await getUserIdFromRequest(c.req.header('Authorization'));
  
  // Convertir fechas ISO string a Date si es necesario
  const dateFields = ['FechaDescarga', 'modified_at', 'created_at'];
  dateFields.forEach(field => {
    if (body[field] && typeof body[field] === 'string') {
      body[field] = new Date(body[field]);
    }
  });
  
  // Agregar información de auditoría
  const dataToUpdate = {
    ...body,
    modified_at: new Date(),
    modified_by: userId
  };
  
  await db.update(estructura).set(dataToUpdate).where(eq(estructura.id, id));
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
  
  // Obtener usuario actual
  const userId = await getUserIdFromRequest(c.req.header('Authorization'));
  
  // Agregar información de auditoría
  const dataToInsert = {
    ...body,
    updated_at: new Date(),
    updated_by: userId
  };
  
  const [newPallet] = await db.insert(pallets).values(dataToInsert).returning();
  return c.json(newPallet, 201);
});
app.put('/pallets/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();
  
  // Obtener usuario actual
  const userId = await getUserIdFromRequest(c.req.header('Authorization'));
  
  // Agregar información de auditoría
  const dataToUpdate = {
    ...body,
    updated_at: new Date(),
    updated_by: userId
  };
  
  await db.update(pallets).set(dataToUpdate).where(eq(pallets.id, id));
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

// Configuración de multer para uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads_data'));
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `${timestamp}_${Math.random().toString(36).substring(2)}${ext}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // Solo permitir imágenes
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos de imagen'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB máximo
  }
});

// Endpoint para subir archivos
app.post('/upload/:table/:recordId', async (c) => {
  const table = c.req.param('table');
  const recordId = c.req.param('recordId');
  
  // Validar que la tabla sea válida
  const validTables = ['camiones', 'estructura', 'pallets'];
  if (!validTables.includes(table)) {
    return c.json({ error: 'Tabla no válida' }, 400);
  }

  return new Promise((resolve) => {
    const uploadMiddleware = upload.single('file');
    
    // Convertir Hono request a formato compatible con multer
    const req: any = {
      body: {},
      file: null,
      headers: Object.fromEntries(c.req.raw.headers.entries())
    };
    
    const res: any = {
      status: () => res,
      json: (data: any) => resolve(c.json(data))
    };

    // Procesar archivo usando multer
    c.req.raw.formData().then(async (formData) => {
      const file = formData.get('file') as File;
      if (!file) {
        return resolve(c.json({ error: 'No se encontró archivo' }, 400));
      }

      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        return resolve(c.json({ error: 'Solo se permiten archivos de imagen' }, 400));
      }

      // Validar tamaño (10MB máximo)
      if (file.size > 10 * 1024 * 1024) {
        return resolve(c.json({ error: 'El archivo es muy grande. Máximo 10MB' }, 400));
      }

      try {
        // Generar nombre único
        const timestamp = Date.now();
        const ext = path.extname(file.name);
        const filename = `${timestamp}_${Math.random().toString(36).substring(2)}${ext}`;
        
        // Crear ruta completa
        const uploadPath = path.join(__dirname, '../uploads_data', filename);
        
        // Guardar archivo
        const buffer = await file.arrayBuffer();
        await fs.writeFile(uploadPath, Buffer.from(buffer));
        
        // Guardar información en base de datos
        const [newArchivo] = await db.insert(archivos).values({
          filename: filename,
          original_name: file.name,
          mime_type: file.type,
          size: file.size,
          table_name: table,
          record_id: recordId
        }).returning();

        resolve(c.json(newArchivo, 201));
      } catch (error) {
        console.error('Error subiendo archivo:', error);
        resolve(c.json({ error: 'Error interno del servidor' }, 500));
      }
    }).catch((error) => {
      console.error('Error procesando FormData:', error);
      resolve(c.json({ error: 'Error procesando archivo' }, 400));
    });
  });
});

// Endpoint para obtener archivos de un registro
app.get('/files/:table/:recordId', async (c) => {
  const table = c.req.param('table');
  const recordId = c.req.param('recordId');
  
  const files = await db.select().from(archivos)
    .where(and(eq(archivos.table_name, table), eq(archivos.record_id, recordId)))
    .orderBy(archivos.created_at);
  
  return c.json(files);
});

// Endpoint para servir archivos
app.get('/uploads/:filename', async (c) => {
  const filename = c.req.param('filename');
  const filePath = path.join(__dirname, '../uploads_data', filename);
  
  try {
    await fs.access(filePath);
    const stream = createReadStream(filePath);
    
    return new Response(stream as any, {
      headers: {
        'Content-Type': 'image/jpeg', // Por defecto, pero se puede mejorar detectando el tipo
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error) {
    return c.notFound();
  }
});

// Endpoint para eliminar archivo
app.delete('/files/:id', async (c) => {
  const id = Number(c.req.param('id'));
  
  try {
    // Obtener información del archivo
    const [archivo] = await db.select().from(archivos).where(eq(archivos.id, id));
    if (!archivo) {
      return c.notFound();
    }
    
    // Eliminar archivo físico
    const filePath = path.join(__dirname, '../uploads_data', archivo.filename);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.warn('No se pudo eliminar el archivo físico:', error);
    }
    
    // Eliminar registro de base de datos
    await db.delete(archivos).where(eq(archivos.id, id));
    
    return c.json({ ok: true });
  } catch (error) {
    console.error('Error eliminando archivo:', error);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
});

const port = Number(PORT);
serve({ fetch: app.fetch, port });
console.log(`Hono server running on http://localhost:${port}`);


