import crypto from "crypto";
import {
  Currency,
  CreateCurrencyDto,
  UpdateCurrencyDto,
  ICurrencyRepository,
} from "./currency.types";

export class InMemoryCurrencyRepository implements ICurrencyRepository {
  private readonly store = new Map<string, Currency>();

  public findAll(): Currency[] {
    return Array.from(this.store.values()).map((currency) => ({ ...currency }));
  }

  public findById(id: string): Currency | undefined {
    const currency = this.store.get(id);
    if (!currency) {
      return undefined;
    }
    return { ...currency };
  }

  public findByTicker(ticker: string): Currency | undefined {
    const normalizedTicker = ticker.toUpperCase();

    for (const currency of this.store.values()) {
      if (currency.ticker.toUpperCase() === normalizedTicker) {
        return { ...currency };
      }
    }
    return undefined;
  }

  public create(dto: CreateCurrencyDto): Currency {
    const id = crypto.randomUUID();

    const newCurrency: Currency = {
      id,
      name: dto.name,
      ticker: dto.ticker.toUpperCase(),
    };

    this.store.set(id, newCurrency);

    return { ...newCurrency };
  }

  public update(id: string, dto: UpdateCurrencyDto): Currency | undefined {
    const existing = this.store.get(id);
    if (!existing) {
      return undefined;
    }

    const updatedCurrency: Currency = {
      ...existing,
      name: dto.name !== undefined ? dto.name : existing.name,
      ticker:
        dto.ticker !== undefined ? dto.ticker.toUpperCase() : existing.ticker,
    };

    this.store.set(id, updatedCurrency);

    return { ...updatedCurrency };
  }

  public delete(id: string): boolean {
    return this.store.delete(id);
  }
}
