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
        ticker TEXT NOT NULL UNIQUE
      );

      CREATE TABLE IF NOT EXISTS prices (
        id TEXT PRIMARY KEY,
        currency_id TEXT NOT NULL,
        symbol TEXT NOT NULL UNIQUE, -- уникальный символ, чтобы работал механизм UPSERT
        price TEXT NOT NULL,
        FOREIGN KEY(currency_id) REFERENCES currencies(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS addresses (
        id TEXT PRIMARY KEY,
        address TEXT NOT NULL UNIQUE,
        label TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL  
      );

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
