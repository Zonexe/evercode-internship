import "dotenv/config";
import container from "./container";

const { logger, scheduler, config, updatePricesTask, app } = container.cradle;

logger.info(
  `Приложение "${config.appName}" (v${config.version}) успешно инициализировано.`,
);

app.start();

scheduler.startTask("UpdatePricesTask", 60000, updatePricesTask);
