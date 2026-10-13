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
        error: `Валюта с тикером "${ticker}" отсутствует в реестре разрешенных криптовалют приложения`,
      });
      return;
    }

    this.logger.debug(`Запрос истории цен для криптовалюты ${ticker} из БД`);
    const priceHistory = this.priceRepository.getHistoryByTicker(ticker);

    this.logger.info(
      `Для тикера "${ticker}" найдено записей истории цен: ${priceHistory.length}`,
    );
    res.json(priceHistory);
  };

  public getLatest = async (req: Request, res: Response): Promise<void> => {
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
        error: `Валюта с тикером "${ticker}" отсутствует в реестре разрешенных криптовалют приложения`,
      });
      return;
    }

    const latestPrice = this.priceRepository.getLatestPrice(
      existingCurrency.id,
    );

    if (!latestPrice) {
      res.status(404).json({
        error: `Для валюты "${ticker}" пока нет сохраненных цен. Дождитесь выполнения фоновой синхронизации.`,
      });
      return;
    }

    res.json(latestPrice);
  };
}
