import { DatabaseSync } from "node:sqlite";
import fs from "fs";
import path from "path";

export function createDatabase(dbPath: string): DatabaseSync {
  if (dbPath !== ":memory:") {
    const dir = path.dirname(dbPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new DatabaseSync(dbPath);

  db.exec("PRAGMA foreign_keys = ON;");

  return db;
}
