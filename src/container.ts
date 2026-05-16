import { createContainer, asFunction, asValue } from "awilix";
import { Logger } from "./utils/logger";
import Scheduler from "./services/scheduler";
import config from "./config";

const container = createContainer();

container.register({
  config: asValue(config),
  logger: asValue(new Logger(config.appName)),
});

container.register({
  scheduler: asFunction((c) => new Scheduler(c.logger)).singleton(),
});

export default container;
