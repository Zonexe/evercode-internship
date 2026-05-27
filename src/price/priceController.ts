import { Request, Response } from "express";
import { ICurrencyRepository } from "../currencies/currency.types";
import { IBinanceService } from "./binance.types";
import { ILogger } from "../utils/logger";
import { AppError } from "../errors/AppError";

export class PriceController {
  private readonly currencyRepository: ICurrencyRepository;
  private readonly binanceService: IBinanceService;
  private readonly logger: ILogger;

  constructor({
    currencyRepository,
    binanceService,
    logger,
  }: {
    currencyRepository: ICurrencyRepository;
    binanceService: IBinanceService;
    logger: ILogger;
  }) {
    this.currencyRepository = currencyRepository;
    this.binanceService = binanceService;
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

    try {
      this.logger.debug(
        `Запрос курсов для валюты ${ticker} через Binance Service...`,
      );

      const allPrices = await this.binanceService.getAllPrices();

      const filteredPrices = allPrices.filter((item) =>
        item.symbol.includes(ticker),
      );

      this.logger.info(
        `Для тикера "${ticker}" успешно найдено торговых пар на Binance: ${filteredPrices.length}`,
      );

      res.json(filteredPrices);
    } catch (error) {
      this.logger.error(
        "Контроллер зафиксировал сбой при запросе цен от Binance",
        {
          context: {
            ticker,
            error: error instanceof Error ? error.message : String(error),
          },
        },
      );

      if (error instanceof AppError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }

      res.status(500).json({
        error: "Внутренняя ошибка сервера при попытке получить цены",
      });
    }
  };
}
