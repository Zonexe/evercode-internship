import { DatabaseSync } from "node:sqlite";
import fs from "fs";
import path from "path";

export function initSchema(db: DatabaseSync): void {
  db.exec("PRAGMA foreign_keys = ON;");

  db.exec(`
    CREATE TABLE IF NOT EXISTS currencies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      ticker TEXT NOT NULL UNIQUE,
      is_tracked INTEGER NOT NULL DEFAULT 0,
      last_updated TEXT
    );

    CREATE TABLE IF NOT EXISTS price_history (
      id TEXT PRIMARY KEY,
      currency_id TEXT NOT NULL,
      price TEXT NOT NULL,
      recorded_at TEXT NOT NULL,
      FOREIGN KEY(currency_id) REFERENCES currencies(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_price_history_currency_id
      ON price_history(currency_id);

    CREATE INDEX IF NOT EXISTS idx_price_history_recorded_at
      ON price_history(recorded_at);
  `);
}

export interface DatabaseOptions {
  autoInit?: boolean;
}

export function createDatabase(
  dbPath: string,
  options: DatabaseOptions = { autoInit: true },
): DatabaseSync {
  if (dbPath !== ":memory:") {
    const dir = path.dirname(dbPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new DatabaseSync(dbPath);

  db.exec("PRAGMA foreign_keys = ON;");

  if (dbPath !== ":memory:") {
    db.exec("PRAGMA journal_mode = WAL;");
  }

  if (options.autoInit) {
    initSchema(db);
  }

  return db;
}
