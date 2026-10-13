export interface CoinMarketCapPrice {
  symbol: string;
  price: string;
}

export interface ICoinMarketCapService {
  getPrices(tickers: string[]): Promise<CoinMarketCapPrice[]>;
}
