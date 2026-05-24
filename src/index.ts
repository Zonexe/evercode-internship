import container from "./container";

const logger = container.resolve("logger");
const scheduler = container.resolve("scheduler");
const config = container.resolve("config");
const myTask = container.resolve("myTask");
const app = container.resolve("app");

logger.info(
  `Приложение "${config.appName}" (v${config.version}) инициализировано.`,
);

app.start();

scheduler.startTask("MyPeriodicTask", 10000, myTask);
