import { createContainer, asClass, asValue } from "awilix";
import { Logger } from "./utils/logger";
import Scheduler from "./services/scheduler";
import config from "./config";

const container = createContainer();

container.register({
  config: asValue(config),

  logger: asValue(new Logger(config.appName)),

  scheduler: asClass(Scheduler).singleton(),
});

export default container;
