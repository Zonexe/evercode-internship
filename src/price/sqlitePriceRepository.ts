import { DatabaseSync, StatementSync } from "node:sqlite";
import crypto from "crypto";
import { Price, IPriceRepository } from "./price.types";

export class SqlitePriceRepository implements IPriceRepository {
  private readonly db: DatabaseSync;
  private readonly saveStmt: StatementSync;
  private readonly getByTickerStmt: StatementSync;

  constructor({ database }: { database: DatabaseSync }) {
    this.db = database;

    this.saveStmt = this.db.prepare(`
      INSERT INTO prices (id, currency_id, symbol, price)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(symbol) DO UPDATE SET price = excluded.price
    `);

    this.getByTickerStmt = this.db.prepare(`
      SELECT p.* FROM prices p
      JOIN currencies c ON p.currency_id = c.id
      WHERE UPPER(c.ticker) = UPPER(?)
    `);
  }

  public savePrices(
    currencyId: string,
    prices: { symbol: string; price: string }[],
  ): void {
    this.db.exec("BEGIN TRANSACTION;");
    try {
      for (const item of prices) {
        const id = crypto.randomUUID();
        this.saveStmt.run(id, currencyId, item.symbol, item.price);
      }
      this.db.exec("COMMIT;");
    } catch (error) {
      this.db.exec("ROLLBACK;");
      throw error;
    }
  }

  public getPricesByTicker(ticker: string): Price[] {
    const rows = this.getByTickerStmt.all(ticker);
    return rows as unknown as Price[];
  }
}
