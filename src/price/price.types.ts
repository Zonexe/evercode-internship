export interface Price {
  id: string;
  currencyId: string;
  symbol: string;
  price: string;
}

export interface IPriceRepository {
  savePrices(
    currencyId: string,
    prices: { symbol: string; price: string }[],
  ): void;

  getPricesByTicker(ticker: string): Price[];
}
