import config from "./config";
import { createLogger } from "./utils/logger";
import Scheduler from "./services/scheduler";
import { myPeriodicTask } from "./tasks/myTask";

const appLogger = createLogger(config.appName);
const myScheduler = new Scheduler(appLogger);

appLogger(
  `Приложение версии ${config.version} успешно запущено на порту ${config.port}!`,
);

myScheduler.startTask("MyPeriodicTask", 10000, myPeriodicTask);
