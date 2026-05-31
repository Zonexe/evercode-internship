import "dotenv/config";
import fs from "fs";
import path from "path";
import config from "../config";
import { createDatabase } from "./database";

function initDb(): void {
  const dbPath = config.dbPath;

  if (dbPath !== ":memory:") {
    const dir = path.dirname(dbPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = createDatabase(dbPath);

  try {
    db.pragma("foreign_keys = ON");

    db.exec(`
      CREATE TABLE IF NOT EXISTS currencies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        ticker TEXT NOT NULL UNIQUE
      );
    `);

    console.log(
      `[Database] Инициализация успешно завершена. Файл БД: ${dbPath}`,
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
