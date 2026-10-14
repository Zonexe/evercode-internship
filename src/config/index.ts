import "dotenv/config";

export interface AppConfig {
  appName: string;
  version: string;
  port: number;
  apiToken: string;
  coinMarketCapApiKey: string;
  dbPath: string;
}

const rawApiToken = process.env.API_TOKEN?.trim();
const rawCmcApiKey = process.env.COINMARKETCAP_API_KEY?.trim();

if (!rawApiToken) {
  throw new Error(
    "Критическая ошибка конфигурации: Переменная окружения API_TOKEN не задана.",
  );
}

if (rawApiToken.length !== 64) {
  throw new Error(
    "Критическая ошибка конфигурации: API_TOKEN должен содержать ровно 64 символа.",
  );
}

if (!rawCmcApiKey) {
  throw new Error(
    "Критическая ошибка конфигурации: Переменная окружения COINMARKETCAP_API_KEY не задана.",
  );
}

const parsePort = (rawPort: string | undefined): number => {
  if (rawPort === undefined || rawPort.trim() === "") {
    return 3000;
  }

  const parsed = parseInt(rawPort, 10);

  if (isNaN(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error(
      `Критическая ошибка конфигурации: Недопустимый порт "${rawPort}".`,
    );
  }

  return parsed;
};

export const config: Readonly<AppConfig> = Object.freeze({
  appName: process.env.APP_NAME?.trim() || "EvercodeInternshipApp",
  version: process.env.APP_VERSION?.trim() || "1.0.0",
  port: parsePort(process.env.PORT),
  apiToken: rawApiToken,
  coinMarketCapApiKey: rawCmcApiKey,
  dbPath: process.env.DB_PATH?.trim() || "./data/currencies.db",
});
