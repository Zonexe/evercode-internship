import "dotenv/config";
import container from "./container";

const { logger, scheduler, config, myTask, app } = container.cradle;

logger.info(
  `Приложение "${config.appName}" (v${config.version}) успешно инициализировано.`,
);

app.start();

scheduler.startTask("MyPeriodicTask", 10000, myTask);
