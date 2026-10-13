import { ITask } from "../services/scheduler";
import { ICurrencyRepository } from "../currencies/currency.types";
import { IPriceRepository } from "../price/price.types";
import { ICoinMarketCapService } from "../price/coinMarketCap.types";
import { ILogger } from "../utils/logger";

export class UpdatePricesTask implements ITask {
  private readonly currencyRepository: ICurrencyRepository;
  private readonly priceRepository: IPriceRepository;
  private readonly coinMarketCapService: ICoinMarketCapService;
  private readonly logger: ILogger;

  constructor({
    currencyRepository,
    priceRepository,
    coinMarketCapService,
    logger,
  }: {
    currencyRepository: ICurrencyRepository;
    priceRepository: IPriceRepository;
    coinMarketCapService: ICoinMarketCapService;
    logger: ILogger;
  }) {
    this.currencyRepository = currencyRepository;
    this.priceRepository = priceRepository;
    this.coinMarketCapService = coinMarketCapService;
    this.logger = logger;
  }

  public async execute(): Promise<void> {
    this.logger.info("Запуск фоновой задачи обновления курсов криптовалют...");

    try {
      const currencies = this.currencyRepository.findTracked();

      if (currencies.length === 0) {
        this.logger.warn(
          "Нет отслеживаемых криптовалют. Фоновое обновление цен пропущено.",
        );
        return;
      }

      const tickers = currencies.map((currency) => currency.ticker);

      const prices = await this.coinMarketCapService.getPrices(tickers);

      const recordedAt = new Date().toISOString();

      for (const currency of currencies) {
        const price = prices.find(
          (item) => item.symbol.toUpperCase() === currency.ticker.toUpperCase(),
        );

        if (!price) {
          this.logger.warn(
            `CoinMarketCap не вернул цену для криптовалюты ${currency.ticker}.`,
          );
          continue;
        }

        this.priceRepository.savePrice(currency.id, price.price, recordedAt);

        this.currencyRepository.setTracked(currency.id, true, recordedAt);

        this.logger.debug(
          `Цена ${currency.ticker} успешно обновлена: ${price.price} USD.`,
        );
      }

      this.logger.info(
        "Фоновое обновление курсов криптовалют успешно завершено.",
      );
    } catch (error) {
      this.logger.error("Сбой при фоновом обновлении курсов криптовалют", {
        context: {
          error: error instanceof Error ? error.message : String(error),
        },
      });

      throw error;
    }
  }
}
