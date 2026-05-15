import config from "./config";
import { ConsoleLogger } from "./utils/logger";
import Scheduler from "./services/scheduler";
import { myPeriodicTask } from "./tasks/myTask";

const appLogger = new ConsoleLogger(config.appName);

const myScheduler = new Scheduler(appLogger);

appLogger.log(
  `Приложение версии ${config.version} успешно запущено на порту ${config.port}!`,
);

myScheduler.startTask("MyPeriodicTask", 10000, myPeriodicTask);
