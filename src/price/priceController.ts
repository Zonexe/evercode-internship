import { Request, Response } from "express";
import { ICurrencyRepository } from "../currencies/currency.types";
import { IPriceRepository } from "./price.types";
import { ILogger } from "../utils/logger";

export class PriceController {
  private readonly currencyRepository: ICurrencyRepository;
  private readonly priceRepository: IPriceRepository;
  private readonly logger: ILogger;

  constructor({
    currencyRepository,
    priceRepository,
    logger,
  }: {
    currencyRepository: ICurrencyRepository;
    priceRepository: IPriceRepository;
    logger: ILogger;
  }) {
    this.currencyRepository = currencyRepository;
    this.priceRepository = priceRepository;
    this.logger = logger;
  }

  public getPrice = async (req: Request, res: Response): Promise<void> => {
    const { currency } = req.query;

    if (!currency || typeof currency !== "string" || currency.trim() === "") {
      res.status(400).json({
        error:
          "Поле 'currency' обязательно для передачи в query-параметрах и должно быть непустой строкой",
      });
      return;
    }

    const ticker = currency.toUpperCase().trim();

    const existingCurrency = this.currencyRepository.findByTicker(ticker);
    if (!existingCurrency) {
      res.status(404).json({
        error: `Валюта с тикером "${ticker}" отсутствует в реестре разрешенных валют нашего приложения`,
      });
      return;
    }

    this.logger.debug(`Запрос курсов для валюты ${ticker} из БД`);

    const cachedPrices = this.priceRepository.getPricesByTicker(ticker);

    this.logger.info(
      `Для тикера "${ticker}" успешно найдено торговых пар на Binance: ${cachedPrices.length}`,
    );

    res.json(cachedPrices);
  };
}
