import Database from "better-sqlite3";
import crypto from "crypto";
import {
  Currency,
  CreateCurrencyDto,
  UpdateCurrencyDto,
  ICurrencyRepository,
} from "./currency.types";

export class SqliteCurrencyRepository implements ICurrencyRepository {
  private readonly db: Database.Database;

  private readonly findAllStmt: Database.Statement<[], Currency>;
  private readonly findByIdStmt: Database.Statement<[string], Currency>;
  private readonly findByTickerStmt: Database.Statement<[string], Currency>;

  private readonly createStmt: Database.Statement<[string, string, string]>;
  private readonly updateStmt: Database.Statement<[string, string, string]>;
  private readonly deleteStmt: Database.Statement<[string]>;

  constructor({ database }: { database: Database.Database }) {
    this.db = database;

    this.findAllStmt = this.db.prepare<[], Currency>(
      "SELECT * FROM currencies",
    );
    this.findByIdStmt = this.db.prepare<[string], Currency>(
      "SELECT * FROM currencies WHERE id = ?",
    );

    this.findByTickerStmt = this.db.prepare<[string], Currency>(
      "SELECT * FROM currencies WHERE UPPER(ticker) = UPPER(?)",
    );
    this.createStmt = this.db.prepare<[string, string, string]>(
      "INSERT INTO currencies (id, name, ticker) VALUES (?, ?, ?)",
    );
    this.updateStmt = this.db.prepare<[string, string, string]>(
      "UPDATE currencies SET name = ?, ticker = ? WHERE id = ?",
    );
    this.deleteStmt = this.db.prepare<[string]>(
      "DELETE FROM currencies WHERE id = ?",
    );
  }
  public findAll(): Currency[] {
    return this.findAllStmt.all();
  }

  public findById(id: string): Currency | undefined {
    return this.findByIdStmt.get(id);
  }

  public findByTicker(ticker: string): Currency | undefined {
    return this.findByTickerStmt.get(ticker);
  }

  public create(dto: CreateCurrencyDto): Currency {
    const id = crypto.randomUUID();
    const normalizedTicker = dto.ticker.toUpperCase();

    this.createStmt.run(id, dto.name, normalizedTicker);

    return {
      id,
      name: dto.name,
      ticker: normalizedTicker,
    };
  }

  public update(id: string, dto: UpdateCurrencyDto): Currency | undefined {
    const existing = this.findById(id);
    if (!existing) {
      return undefined;
    }

    const updatedName = dto.name !== undefined ? dto.name : existing.name;
    const updatedTicker =
      dto.ticker !== undefined ? dto.ticker.toUpperCase() : existing.ticker;

    this.updateStmt.run(updatedName, updatedTicker, id);

    return {
      id,
      name: updatedName,
      ticker: updatedTicker,
    };
  }

  public delete(id: string): boolean {
    const result = this.deleteStmt.run(id);

    return result.changes > 0;
  }
}
