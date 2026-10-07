export interface Currency {
  id: string;
  name: string;
  ticker: string;
  isTracked: boolean;
  lastUpdated: string | null;
}

export type CreateCurrencyDto = Omit<
  Currency,
  "id" | "isTracked" | "lastUpdated"
>;

export type UpdateCurrencyDto = Partial<CreateCurrencyDto>;

export interface ICurrencyRepository {
  findAll(): Currency[];
  findById(id: string): Currency | undefined;
  findByTicker(ticker: string): Currency | undefined;

  create(dto: CreateCurrencyDto): Currency;

  update(id: string, dto: UpdateCurrencyDto): Currency | undefined;

  delete(id: string): boolean;

  findTracked(): Currency[];

  setTracked(
    id: string,
    isTracked: boolean,
    lastUpdated?: string,
  ): Currency | undefined;
}
