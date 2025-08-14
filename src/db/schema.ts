import { pgTable, bigint, text, timestamp, boolean, doublePrecision } from 'drizzle-orm/pg-core';

export const camiones = pgTable('Camiones', {
  id: bigint('id', { mode: 'number' }).primaryKey().notNull().generatedAlwaysAsIdentity(),
  DNI: text('DNI'),
  Matricula: text('Matricula'),
  UbicacionCampa: text('UbicacionCampa'),
  FechaDescarga: timestamp('FechaDescarga', { withTimezone: true }),
  Container: text('Container'),
  Albaran: text('Albaran'),
  NombreConductor: text('NombreConductor'),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const estructura = pgTable('Estructura', {
  id: bigint('id', { mode: 'number' }).primaryKey().notNull().generatedAlwaysAsIdentity(),
  DNI: text('DNI'),
  Conductor: text('Conductor'),
  Matricula: text('Matricula'),
  Proveedor: text('Proveedor'),
  PackingList: text('PackingList'),
  Albaran: text('Albaran'),
  modified_at: timestamp('modified_at', { withTimezone: true }).defaultNow(),
  FechaDescarga: timestamp('FechaDescarga', { withTimezone: true }),
});

export const pallets = pgTable('Pallets', {
  id: text('id').primaryKey().notNull(),
  Descarga: bigint('Descarga', { mode: 'number' }),
  Defecto: boolean('Defecto'),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const paneles = pgTable('Paneles', {
  SN: text('SN').primaryKey().notNull(),
  Potencia: doublePrecision('Potencia'),
  SNPallet: text('SNPallet'),
});

export const usuarios = pgTable('usuarios', {
  id: bigint('id', { mode: 'number' }).primaryKey().notNull().generatedAlwaysAsIdentity(),
  keycloak_id: text('keycloak_id').unique().notNull(),
  email: text('email').notNull(),
  rol: text('rol').default('user').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const archivos = pgTable('archivos', {
  id: bigint('id', { mode: 'number' }).primaryKey().notNull().generatedAlwaysAsIdentity(),
  filename: text('filename').notNull(),
  original_name: text('original_name').notNull(),
  mime_type: text('mime_type').notNull(),
  size: bigint('size', { mode: 'number' }).notNull(),
  table_name: text('table_name').notNull(), // 'camiones', 'estructura', 'pallets'
  record_id: text('record_id').notNull(), // ID del registro asociado
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});


