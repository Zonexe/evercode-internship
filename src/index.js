const config = require("./config");
const { createLogger } = require("./utils/logger");
const Scheduler = require("./services/scheduler");
const { myPeriodicTask } = require("./tasks/myTask");

const appLogger = createLogger(config.appName);

const myScheduler = new Scheduler(appLogger);

appLogger(
  `Приложение версии ${config.version} успешно запущено на порту ${config.port}!`,
);

myScheduler.startTask("MyPeriodicTask", 10000, myPeriodicTask);
