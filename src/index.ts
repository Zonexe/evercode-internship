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

const gracefulShutdown = async (signal: string): Promise<void> => {
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

  const timeoutId = setTimeout(() => {
    logger.error(
      "Превышено время ожидания плавной остановки. Принудительный выход.",
    );
    process.exit(1);
  }, 10000);

  timeoutId.unref();

  let exitCode = 0;

  try {
    await scheduler.stopAll();
    logger.info("Планировщик задач остановлен.");
  } catch (error) {
    exitCode = 1;

    logger.error("Ошибка при остановке планировщика задач.", {
      context: {
        error: error instanceof Error ? error.message : String(error),
      },
    });
  }

  try {
    await new Promise<void>((resolve, reject) => {
      server.close((error?: Error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    logger.info("HTTP-сервер успешно остановлен.");
  } catch (error) {
    exitCode = 1;

    logger.error("Ошибка при закрытии HTTP-сервера.", {
      context: {
        error: error instanceof Error ? error.message : String(error),
      },
    });
  }

  try {
    database.close();
    logger.info("Соединение с базой данных успешно закрыто.");
  } catch (error) {
    exitCode = 1;

    logger.error("Ошибка при закрытии базы данных.", {
      context: {
        error: error instanceof Error ? error.message : String(error),
      },
    });
  }

  clearTimeout(timeoutId);
  process.exitCode = exitCode;
};

process.on("SIGINT", () => {
  void gracefulShutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void gracefulShutdown("SIGTERM");
});
