import { DatabaseSync, StatementSync } from "node:sqlite";
import crypto from "crypto";
import {
  Currency,
  CreateCurrencyDto,
  UpdateCurrencyDto,
  ICurrencyRepository,
} from "./currency.types";

interface CurrencyRow {
  id: string;
  name: string;
  ticker: string;
  is_tracked: number;
  last_updated: string | null;
}

function mapCurrency(row: CurrencyRow): Currency {
  return {
    id: row.id,
    name: row.name,
    ticker: row.ticker,
    isTracked: row.is_tracked === 1,
    lastUpdated: row.last_updated,
  };
}

export class SqliteCurrencyRepository implements ICurrencyRepository {
  private readonly db: DatabaseSync;
  private readonly findAllStmt: StatementSync;
  private readonly findByIdStmt: StatementSync;
  private readonly findByTickerStmt: StatementSync;
  private readonly findTrackedStmt: StatementSync;
  private readonly createStmt: StatementSync;
  private readonly updateStmt: StatementSync;
  private readonly deleteStmt: StatementSync;
  private readonly setTrackedStmt: StatementSync;

  constructor({ database }: { database: DatabaseSync }) {
    this.db = database;

    this.findAllStmt = this.db.prepare(`
      SELECT *
      FROM currencies
      ORDER BY name
    `);

    this.findByIdStmt = this.db.prepare(`
      SELECT *
      FROM currencies
      WHERE id = ?
    `);

    this.findByTickerStmt = this.db.prepare(`
      SELECT *
      FROM currencies
      WHERE UPPER(ticker) = UPPER(?)
    `);

    this.findTrackedStmt = this.db.prepare(`
      SELECT *
      FROM currencies
      WHERE is_tracked = 1
      ORDER BY name
    `);

    this.createStmt = this.db.prepare(`
      INSERT INTO currencies (
        id,
        name,
        ticker,
        is_tracked,
        last_updated
      )
      VALUES (?, ?, ?, 0, NULL)
    `);

    this.updateStmt = this.db.prepare(`
      UPDATE currencies
      SET name = ?, ticker = ?
      WHERE id = ?
    `);

    this.deleteStmt = this.db.prepare(`
      DELETE FROM currencies
      WHERE id = ?
    `);

    this.setTrackedStmt = this.db.prepare(`
      UPDATE currencies
      SET is_tracked = ?,
          last_updated = ?
      WHERE id = ?
    `);
  }

  public findAll(): Currency[] {
    const rows = this.findAllStmt.all() as unknown as CurrencyRow[];

    return rows.map(mapCurrency);
  }

  public findById(id: string): Currency | undefined {
    const row = this.findByIdStmt.get(id) as unknown as CurrencyRow | undefined;

    return row ? mapCurrency(row) : undefined;
  }

  public findByTicker(ticker: string): Currency | undefined {
    const row = this.findByTickerStmt.get(ticker) as unknown as
      | CurrencyRow
      | undefined;

    return row ? mapCurrency(row) : undefined;
  }

  public findTracked(): Currency[] {
    const rows = this.findTrackedStmt.all() as unknown as CurrencyRow[];

    return rows.map(mapCurrency);
  }

  public create(dto: CreateCurrencyDto): Currency {
    const id = crypto.randomUUID();
    const normalizedTicker = dto.ticker.toUpperCase();

    this.createStmt.run(id, dto.name, normalizedTicker);

    return {
      id,
      name: dto.name,
      ticker: normalizedTicker,
      isTracked: false,
      lastUpdated: null,
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
      ...existing,
      name: updatedName,
      ticker: updatedTicker,
    };
  }

  public delete(id: string): boolean {
    const result = this.deleteStmt.run(id);

    return Number(result.changes) > 0;
  }

  public setTracked(
    id: string,
    isTracked: boolean,
    lastUpdated?: string,
  ): Currency | undefined {
    const existing = this.findById(id);

    if (!existing) {
      return undefined;
    }

    const updatedLastUpdated =
      lastUpdated !== undefined ? lastUpdated : existing.lastUpdated;

    this.setTrackedStmt.run(isTracked ? 1 : 0, updatedLastUpdated, id);

    return {
      ...existing,
      isTracked,
      lastUpdated: updatedLastUpdated,
    };
  }
}
