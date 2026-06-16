import axios, { AxiosInstance } from "axios";
import { ILogger } from "../utils/logger";
import { AppError } from "../errors/AppError";
import { AddressBalance, IBlockcypherService } from "./blockcypher.types";

export class BlockcypherService implements IBlockcypherService {
  private readonly logger: ILogger;
  private readonly httpClient: AxiosInstance;

  constructor({ logger }: { logger: ILogger }) {
    this.logger = logger;

    this.httpClient = axios.create({
      baseURL: "https://api.blockcypher.com",
      timeout: 5000,
    });
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public async getBlockchainHeight(): Promise<number> {
    const maxAttempts = 3;
    let currentDelay = 500;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        this.logger.debug(
          `Запрос высоты блокчейна к Blockcypher. Попытка ${attempt} из ${maxAttempts}...`,
        );

        const response = await this.httpClient.get<{ height: number }>(
          "/v1/btc/main",
        );
        return response.data.height;
      } catch (error) {
        lastError = error;
        const isLastAttempt = attempt === maxAttempts;

        if (axios.isAxiosError(error)) {
          const status = error.response?.status;

          if (status && status >= 400 && status < 500 && status !== 429) {
            this.logger.error(
              `Критическая ошибка клиента при запросе к Blockcypher: ${status}. Прерываем ретраи.`,
              { context: { error: error.message } },
            );
            throw new AppError(
              `Blockcypher API вернул ошибку клиента: ${status}`,
              502,
            );
          }
          this.logger.warn(
            `Попытка ${attempt} завершилась неудачей: ${error.message}. ` +
              (isLastAttempt
                ? "Попытки исчерпаны."
                : `Ожидание ${currentDelay}мс перед следующей...`),
            { context: { status, code: error.code } },
          );
        } else {
          this.logger.warn(
            `Попытка ${attempt} завершилась неизвестной ошибкой. ` +
              (isLastAttempt ? "" : `Ожидание ${currentDelay}мс...`),
            {
              context: {
                error: error instanceof Error ? error.message : String(error),
              },
            },
          );
        }

        if (!isLastAttempt) {
          await this.wait(currentDelay);
          currentDelay *= 2;
        }
      }
    }

    throw new AppError(
      "Не удалось получить данные о высоте блокчейна от Blockcypher API после 3 попыток.",
      502,
      {
        originalError:
          lastError instanceof Error ? lastError.message : String(lastError),
      },
    );
  }

  public async getAddressBalance(address: string): Promise<AddressBalance> {
    const maxAttempts = 3;
    let currentDelay = 500;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        this.logger.debug(
          `Запрос баланса адреса ${address} к Blockcypher. Попытка ${attempt} из ${maxAttempts}...`,
        );

        const response = await this.httpClient.get<{
          address: string;
          balance: number;
          final_balance: number;
          total_received: number;
          total_sent: number;
        }>(`/v1/btc/main/addrs/${address}/balance`);

        const data = response.data;
        return {
          address: data.address,
          balance: data.balance,
          finalBalance: data.final_balance,
          totalReceived: data.total_received,
          totalSent: data.total_sent,
        };
      } catch (error) {
        lastError = error;
        const isLastAttempt = attempt === maxAttempts;

        if (axios.isAxiosError(error)) {
          const status = error.response?.status;

          if (status === 404 || status === 400) {
            this.logger.warn(
              `Blockcypher зафиксировал невалидный крипто-адрес ${address}: статус ${status}.`,
              { context: { error: error.message } },
            );
            throw new AppError(
              `Невалидный Биткоин-адрес или адрес не найден в сети: ${address}`,
              404,
              { address },
            );
          }

          if (status && status >= 400 && status < 500 && status !== 429) {
            this.logger.error(
              `Критическая ошибка клиента при запросе баланса: ${status}. Прерываем ретраи.`,
              { context: { error: error.message } },
            );
            throw new AppError(
              `Blockcypher API вернул ошибку клиента: ${status}`,
              502,
            );
          }

          this.logger.warn(
            `Попытка ${attempt} получения баланса завершилась неудачей: ${error.message}. ` +
              (isLastAttempt
                ? "Попытки исчерпаны."
                : `Ожидание ${currentDelay}мс перед следующей...`),
            { context: { status, code: error.code } },
          );
        } else {
          this.logger.warn(
            `Попытка ${attempt} получения баланса завершилась неизвестной ошибкой. ` +
              (isLastAttempt ? "" : `Ожидание ${currentDelay}мс...`),
            {
              context: {
                error: error instanceof Error ? error.message : String(error),
              },
            },
          );
        }

        if (!isLastAttempt) {
          await this.wait(currentDelay);
          currentDelay *= 2;
        }
      }
    }

    throw new AppError(
      `Не удалось получить баланс адреса ${address} от Blockcypher API после 3 попыток.`,
      502,
      {
        originalError:
          lastError instanceof Error ? lastError.message : String(lastError),
      },
    );
  }
}
