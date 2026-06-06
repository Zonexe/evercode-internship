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

  return new DatabaseSync(dbPath);
}
