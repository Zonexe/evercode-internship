import "dotenv/config";
import { config } from "../config";
import { createDatabase, initSchema } from "./database";

function initDb(): void {
  const dbPath = config.dbPath;
  const db = createDatabase(dbPath, { autoInit: false });

  try {
    initSchema(db);

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
