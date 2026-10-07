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
import { UpdatePricesTask } from "./tasks/updatePricesTask";
import { createAuthMiddleware } from "./middlewares/authMiddleware";
import { createErrorMiddleware } from "./middlewares/errorMiddleware";
import { RequestHandler, Router, ErrorRequestHandler } from "express";
import { config } from "./config";

import { DatabaseSync } from "node:sqlite";
import { createDatabase } from "./db/database";
import { SqliteCurrencyRepository } from "./currencies/sqliteCurrencyRepository";

import { ICurrencyRepository } from "./currencies/currency.types";
import { CurrencyController } from "./currencies/currencyController";
import { createCurrencyRouter } from "./currencies/currencyRouter";

import { ICoinMarketCapService } from "./price/coinMarketCap.types";
import { CoinMarketCapHttpService } from "./price/coinMarketCapService";

import { PriceController } from "./price/priceController";
import { createPriceRouter } from "./price/priceRouter";

import { IPriceRepository } from "./price/price.types";
import { SqlitePriceRepository } from "./price/sqlitePriceRepository";

export interface AppCradle {
  config: typeof config;
  logger: ILogger;
  scheduler: Scheduler;
  updatePricesTask: UpdatePricesTask;
  authMiddleware: RequestHandler;

  database: DatabaseSync;

  currencyRepository: ICurrencyRepository;
  currencyController: CurrencyController;
  currencyRouter: Router;

  priceRepository: IPriceRepository;

  coinMarketCapService: ICoinMarketCapService;
  priceController: PriceController;
  priceRouter: Router;

  errorMiddleware: ErrorRequestHandler;

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

  updatePricesTask: asClass(UpdatePricesTask).singleton(),

  authMiddleware: asFunction((c) =>
    createAuthMiddleware(c.config.apiToken),
  ).singleton(),

  currencyRepository: asClass(SqliteCurrencyRepository).singleton(),

  currencyController: asClass(CurrencyController).singleton(),

  currencyRouter: asFunction(createCurrencyRouter).singleton(),

  priceRepository: asClass(SqlitePriceRepository).singleton(),

  coinMarketCapService: asClass(CoinMarketCapHttpService).singleton(),

  priceController: asClass(PriceController).singleton(),

  priceRouter: asFunction(createPriceRouter).singleton(),

  errorMiddleware: asFunction((c) =>
    createErrorMiddleware(c.logger),
  ).singleton(),

  app: asClass(App).singleton(),
});

export default container;
