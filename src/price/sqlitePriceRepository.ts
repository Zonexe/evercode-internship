import { DatabaseSync, StatementSync } from "node:sqlite";
import crypto from "crypto";
import { Price, IPriceRepository } from "./price.types";

interface PriceRow {
  id: string;
  currency_id: string;
  price: string;
  recorded_at: string;
}

function mapPrice(row: PriceRow): Price {
  return {
    id: row.id,
    currencyId: row.currency_id,
    price: row.price,
    recordedAt: row.recorded_at,
  };
}

export class SqlitePriceRepository implements IPriceRepository {
  private readonly db: DatabaseSync;
  private readonly saveStmt: StatementSync;
  private readonly getLatestStmt: StatementSync;
  private readonly getHistoryStmt: StatementSync;

  constructor({ database }: { database: DatabaseSync }) {
    this.db = database;

    this.saveStmt = this.db.prepare(`
      INSERT INTO price_history (
        id,
        currency_id,
        price,
        recorded_at
      )
      VALUES (?, ?, ?, ?)
    `);

    this.getLatestStmt = this.db.prepare(`
      SELECT *
      FROM price_history
      WHERE currency_id = ?
      ORDER BY recorded_at DESC
      LIMIT 1
    `);

    this.getHistoryStmt = this.db.prepare(`
      SELECT ph.*
      FROM price_history ph
      JOIN currencies c ON ph.currency_id = c.id
      WHERE UPPER(c.ticker) = UPPER(?)
      ORDER BY ph.recorded_at DESC
      LIMIT ?
    `);
  }

  public savePrice(
    currencyId: string,
    price: string,
    recordedAt: string,
  ): void {
    const id = crypto.randomUUID();

    this.saveStmt.run(id, currencyId, price, recordedAt);
  }

  public getLatestPrice(currencyId: string): Price | undefined {
    const row = this.getLatestStmt.get(currencyId) as unknown as
      | PriceRow
      | undefined;

    return row ? mapPrice(row) : undefined;
  }

  public getHistoryByTicker(ticker: string, limit = 100): Price[] {
    const rows = this.getHistoryStmt.all(
      ticker,
      limit,
    ) as unknown as PriceRow[];

    return rows.map(mapPrice);
  }
}
