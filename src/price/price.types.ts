export interface Price {
  id: string;
  currencyId: string;
  price: string;
  recordedAt: string;
}

export interface IPriceRepository {
  savePrice(currencyId: string, price: string, recordedAt: string): void;

  getLatestPrice(currencyId: string): Price | undefined;

  getHistoryByTicker(ticker: string, limit?: number): Price[];
}
