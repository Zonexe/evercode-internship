import container from "./container";

const logger = container.resolve("logger");
const scheduler = container.resolve("scheduler");
const config = container.resolve("config");
const myTask = container.resolve("myTask");

logger.info(
  `Приложение версии ${config.version} успешно запущено на порту ${config.port}!`,
);

scheduler.startTask("MyPeriodicTask", 10000, myTask);
