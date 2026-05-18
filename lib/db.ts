import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "cafeteria.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categorias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      orden INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      precio INTEGER NOT NULL,
      categoria_id INTEGER REFERENCES categorias(id),
      disponible INTEGER NOT NULL DEFAULT 1,
      imagen_url TEXT
    );

    CREATE TABLE IF NOT EXISTS ordenes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      total INTEGER NOT NULL,
      propina INTEGER NOT NULL DEFAULT 0,
      metodo_pago TEXT NOT NULL,
      estado TEXT NOT NULL DEFAULT 'pagada',
      creado_en TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS orden_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      orden_id INTEGER NOT NULL REFERENCES ordenes(id),
      producto_id INTEGER NOT NULL REFERENCES productos(id),
      cantidad INTEGER NOT NULL DEFAULT 1,
      precio_unitario INTEGER NOT NULL
    );
  `);
}
