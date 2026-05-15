import { createContainer, asClass, asValue } from "awilix";
import { ConsoleLogger } from "./utils/logger";
import Scheduler from "./services/scheduler";
import config from "./config";

const container = createContainer();

container.register({
  config: asValue(config),

  logger: asValue(new ConsoleLogger(config.appName)),

  scheduler: asClass(Scheduler).singleton(),
});

export default container;
