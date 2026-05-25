import "dotenv/config"; 

interface AppConfig {
  appName: string;
  version: string;
  port: number;
  apiToken: string;
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

const config: AppConfig = {
  appName: process.env.APP_NAME || "EvercodeInternshipApp",
  version: process.env.APP_VERSION || "1.0.0",
  port: Number(process.env.PORT) || 3000,
  apiToken: rawApiToken,
};

export default config;
