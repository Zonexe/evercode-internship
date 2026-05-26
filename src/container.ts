import {
  createContainer,
  asFunction,
  asValue,
  asClass,
  InjectionMode,
} from "awilix";
import { Logger, ILogger, LogLevel } from "./utils/logger";
import { Scheduler } from "./services/scheduler";
import { App } from "./app";
import { MyTask } from "./tasks/myTask";
import { createAuthMiddleware } from "./middlewares/authMiddleware";
import { RequestHandler } from "express";
import config from "./config";

export interface AppCradle {
  config: typeof config;
  logger: ILogger;
  scheduler: Scheduler;
  myTask: MyTask;
  authMiddleware: RequestHandler;
  app: App;
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

  authMiddleware: asFunction((c) =>
    createAuthMiddleware(c.config.apiToken),
  ).singleton(),

  app: asClass(App).singleton(),
});

export default container;
