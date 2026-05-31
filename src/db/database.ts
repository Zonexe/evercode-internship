import Database from "better-sqlite3";

export function createDatabase(dbPath: string): Database.Database {
  return new Database(dbPath);
}
