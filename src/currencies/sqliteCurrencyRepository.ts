import { DatabaseSync, StatementSync } from "node:sqlite";
import crypto from "crypto";
import {
  Currency,
  CreateCurrencyDto,
  UpdateCurrencyDto,
  ICurrencyRepository,
} from "./currency.types";

export class SqliteCurrencyRepository implements ICurrencyRepository {
  private readonly db: DatabaseSync;
  private readonly findAllStmt: StatementSync;
  private readonly findByIdStmt: StatementSync;
  private readonly findByTickerStmt: StatementSync;
  private readonly createStmt: StatementSync;
  private readonly updateStmt: StatementSync;
  private readonly deleteStmt: StatementSync;

  constructor({ database }: { database: DatabaseSync }) {
    this.db = database;

    this.findAllStmt = this.db.prepare("SELECT * FROM currencies");
    this.findByIdStmt = this.db.prepare(
      "SELECT * FROM currencies WHERE id = ?",
    );
    this.findByTickerStmt = this.db.prepare(
      "SELECT * FROM currencies WHERE UPPER(ticker) = UPPER(?)",
    );
    this.createStmt = this.db.prepare(
      "INSERT INTO currencies (id, name, ticker) VALUES (?, ?, ?)",
    );
    this.updateStmt = this.db.prepare(
      "UPDATE currencies SET name = ?, ticker = ? WHERE id = ?",
    );
    this.deleteStmt = this.db.prepare("DELETE FROM currencies WHERE id = ?");
  }

  public findAll(): Currency[] {
    const rows = this.findAllStmt.all();
    return rows as unknown as Currency[];
  }

  public findById(id: string): Currency | undefined {
    const row = this.findByIdStmt.get(id);
    return row ? (row as unknown as Currency) : undefined;
  }

  public findByTicker(ticker: string): Currency | undefined {
    const row = this.findByTickerStmt.get(ticker);
    return row ? (row as unknown as Currency) : undefined;
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

    return Number(result.changes) > 0;
  }
}
