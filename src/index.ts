import container from "./container";
import { myPeriodicTask } from "./tasks/myTask";
import { ILogger } from "./utils/logger";
import { Scheduler } from "./services/scheduler";

const logger = container.resolve<ILogger>("logger");
const scheduler = container.resolve<Scheduler>("scheduler");

import configType from "./config";
const config = container.resolve<typeof configType>("config");

logger.info(
  `Приложение версии ${config.version} успешно запущено на порту ${config.port}!`,
);

scheduler.startTask("MyPeriodicTask", 10000, myPeriodicTask);
