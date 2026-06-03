import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

export function createDatabase(dbPath: string): Database.Database {
  if (dbPath !== ":memory:") {
    const dir = path.dirname(dbPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  return new Database(dbPath);
}
