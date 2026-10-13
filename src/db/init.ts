import "dotenv/config";
import { config } from "../config";
import { createDatabase } from "./database";

function initDb(): void {
  const dbPath = config.dbPath;
  const db = createDatabase(dbPath);

  try {
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

    console.log(
      `[Database] Инициализация схемы успешно завершена. Файл БД: ${dbPath}`,
    );
  } catch (error) {
    console.error(
      "[Database] Критическая ошибка при инициализации схемы БД:",
      error,
    );
    process.exit(1);
  } finally {
    db.close();
  }
}

initDb();
