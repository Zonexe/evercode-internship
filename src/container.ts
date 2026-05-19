import {
  createContainer,
  asFunction,
  asValue,
  asClass,
  InjectionMode,
} from "awilix";
import { Logger, ILogger, LogLevel } from "./utils/logger";
import { Scheduler } from "./services/scheduler";
import { MyTask } from "./tasks/myTask";
import config from "./config";

export interface AppCradle {
  config: typeof config;
  logger: ILogger;
  scheduler: Scheduler;
  myTask: MyTask;
}

const container = createContainer<AppCradle>({
  injectionMode: InjectionMode.PROXY,
});

container.register({
  config: asValue(config),

  logger: asValue(
    new Logger({
      prefix: config.appName,
      minLevel: LogLevel.INFO,
    }),
  ),

  scheduler: asFunction((c) => new Scheduler(c.logger)).singleton(),

  myTask: asClass(MyTask).singleton(),
});

export default container;
