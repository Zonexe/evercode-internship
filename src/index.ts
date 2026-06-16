import "dotenv/config";
import container from "./container";

const { logger, scheduler, config, updatePricesTask, app, database } =
  container.cradle;

logger.info(
  `Приложение "${config.appName}" (v${config.version}) успешно инициализировано.`,
);

const server = app.start();

scheduler.startTask("UpdatePricesTask", 60000, updatePricesTask);

let isShuttingDown = false;

const gracefulShutdown = (signal: string): void => {
  if (isShuttingDown) {
    logger.warn(
      `Повторный сигнал ${signal} проигнорирован, закрытие уже выполняется.`,
    );
    return;
  }
  isShuttingDown = true;

  logger.info(
    `Получен сигнал ${signal}. Начинаем процедуру Graceful Shutdown...`,
  );

  try {
    scheduler.stopAll();
    logger.info("Планировщик задач успешно остановлен.");
  } catch (err) {
    logger.error("Ошибка при остановке планировщика задач:", {
      context: { error: err instanceof Error ? err.message : String(err) },
    });
  }

  server.close((serverErr) => {
    if (serverErr) {
      logger.error("Ошибка при закрытии HTTP-сервера:", {
        context: { error: serverErr.message },
      });
      process.exit(1);
    }
    logger.info("HTTP-сервер успешно остановлен.");

    try {
      database.close();
      logger.info("Соединение с базой данных успешно закрыто.");

      process.exit(0);
    } catch (dbErr) {
      logger.error("Ошибка при закрытии базы данных:", {
        context: {
          error: dbErr instanceof Error ? dbErr.message : String(dbErr),
        },
      });

      process.exit(1);
    }
  });

  const timeoutId = setTimeout(() => {
    logger.error(
      "Превышено время ожидания плавной остановки. Принудительный выход.",
    );
    process.exit(1);
  }, 10000);

  timeoutId.unref();
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
