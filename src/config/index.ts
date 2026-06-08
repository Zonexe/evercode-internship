import "dotenv/config";

interface AppConfig {
  appName: string;
  version: string;
  port: number;
  apiToken: string;
  dbPath: string;
}

const rawApiToken = process.env.API_TOKEN;

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

const parsePort = (rawPort: string | undefined): number => {
  if (rawPort === undefined) {
    return 3000;
  }
  const parsed = parseInt(rawPort, 10);
  if (isNaN(parsed) || parsed < 0 || parsed > 65535) {
    throw new Error(
      `Критическая ошибка конфигурации: Недопустимый порт "${rawPort}".`,
    );
  }
  return parsed;
};

export const config: Readonly<AppConfig> = Object.freeze({
  appName: process.env.APP_NAME || "EvercodeInternshipApp",
  version: process.env.APP_VERSION || "1.0.0",
  port: parsePort(process.env.PORT),
  apiToken: rawApiToken,
  dbPath: process.env.DB_PATH || "./data/currencies.db",
});
