export interface BinancePriceItem {
  symbol: string;
  price: string;
}

export interface IBinanceService {
  getAllPrices(): Promise<BinancePriceItem[]>;
}
