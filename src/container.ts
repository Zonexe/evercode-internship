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
import { createErrorMiddleware } from "./middlewares/errorMiddleware";
import { RequestHandler, Router } from "express";
import { config } from "./config";

import Database from "better-sqlite3";
import { createDatabase } from "./db/database";
import { SqliteCurrencyRepository } from "./currencies/sqliteCurrencyRepository";

import { ICurrencyRepository } from "./currencies/currency.types";
import { InMemoryCurrencyRepository } from "./currencies/currencyRepository";
import { CurrencyController } from "./currencies/currencyController";
import { createCurrencyRouter } from "./currencies/currencyRouter";

import { IBinanceService } from "./price/binance.types";
import { BinanceHttpService } from "./price/binanceService";
import { PriceController } from "./price/priceController";
import { createPriceRouter } from "./price/priceRouter";

export interface AppCradle {
  config: typeof config;
  logger: ILogger;
  scheduler: Scheduler;
  myTask: MyTask;
  authMiddleware: RequestHandler;

  database: Database.Database;

  currencyRepository: ICurrencyRepository;
  currencyController: CurrencyController;
  currencyRouter: Router;

  binanceService: IBinanceService;
  priceController: PriceController;
  priceRouter: Router;

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

  database: asFunction((c) => createDatabase(c.config.dbPath)).singleton(),

  scheduler: asFunction((c) => new Scheduler(c.logger)).singleton(),
  myTask: asClass(MyTask).singleton(),
  authMiddleware: asFunction((c) =>
    createAuthMiddleware(c.config.apiToken),
  ).singleton(),

  currencyRepository: asClass(SqliteCurrencyRepository).singleton(),
  currencyController: asClass(CurrencyController).singleton(),
  currencyRouter: asFunction(createCurrencyRouter).singleton(),

  binanceService: asClass(BinanceHttpService).singleton(),
  priceController: asClass(PriceController).singleton(),
  priceRouter: asFunction(createPriceRouter).singleton(),

  errorMiddleware: asFunction((c) =>
    createErrorMiddleware(c.logger),
  ).singleton(),

  app: asClass(App).singleton(),
});

export default container;
