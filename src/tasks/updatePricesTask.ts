import { ITask } from "../services/scheduler";
import { ICurrencyRepository } from "../currencies/currency.types";
import { IPriceRepository } from "../price/price.types";
import { IBinanceService } from "../price/binance.types";
import { ILogger } from "../utils/logger";

export class UpdatePricesTask implements ITask {
  private readonly currencyRepository: ICurrencyRepository;
  private readonly priceRepository: IPriceRepository;
  private readonly binanceService: IBinanceService;
  private readonly logger: ILogger;

  constructor({
    currencyRepository,
    priceRepository,
    binanceService,
    logger,
  }: {
    currencyRepository: ICurrencyRepository;
    priceRepository: IPriceRepository;
    binanceService: IBinanceService;
    logger: ILogger;
  }) {
    this.currencyRepository = currencyRepository;
    this.priceRepository = priceRepository;
    this.binanceService = binanceService;
    this.logger = logger;
  }

  public async execute(): Promise<void> {
    this.logger.info("Запуск фоновой задачи обновления курсов валют...");

    try {
      const currencies = this.currencyRepository.findAll();

      if (currencies.length === 0) {
        this.logger.warn(
          "Локальный реестр разрешенных валют пуст. Фоновое обновление цен пропущено.",
        );
        return;
      }

      const allBinancePrices = await this.binanceService.getAllPrices();

      for (const currency of currencies) {
        const ticker = currency.ticker.toUpperCase();

        const matchingPrices = allBinancePrices.filter((item) =>
          item.symbol.includes(ticker),
        );

        if (matchingPrices.length > 0) {
          this.priceRepository.savePrices(currency.id, matchingPrices);
          this.logger.debug(
            `Успешно обновлено торговых пар для валюты ${ticker}: ${matchingPrices.length}`,
          );
        } else {
          this.logger.warn(
            `Для тикера ${ticker} не найдено активных торговых пар на Binance.`,
          );
        }
      }

      this.logger.info("Фоновое обновление курсов валют успешно завершено.");
    } catch (error) {
      this.logger.error("Сбой при фоновом обновлении курсов валют", {
        context: {
          error: error instanceof Error ? error.message : String(error),
        },
      });
      throw error;
    }
  }
}
