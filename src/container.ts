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

import { IBinanceService } from "./price/binance.types";
import { BinanceHttpService } from "./price/binanceService";
import { PriceController } from "./price/priceController";
import { createPriceRouter } from "./price/priceRouter";

import { IPriceRepository } from "./price/price.types";
import { SqlitePriceRepository } from "./price/sqlitePriceRepository";

import { IAddressRepository } from "./addresses/address.types";
import { SqliteAddressRepository } from "./addresses/sqliteAddressRepository";
import { AddressController } from "./addresses/addressController";
import { createAddressRouter } from "./addresses/addressRouter";

import { IBlockcypherService } from "./blockchain/blockcypher.types";
import { BlockcypherService } from "./blockchain/blockcypherService";
import { BlockchainController } from "./blockchain/blockchainController";
import { createBlockchainRouter } from "./blockchain/blockchainRouter";

export interface AppCradle {
  config: typeof config;
  logger: ILogger;
  scheduler: Scheduler;
  myTask: MyTask;
  updatePricesTask: UpdatePricesTask;
  authMiddleware: RequestHandler;

  database: DatabaseSync;

  currencyRepository: ICurrencyRepository;
  currencyController: CurrencyController;
  currencyRouter: Router;

  priceRepository: IPriceRepository;

  binanceService: IBinanceService;
  priceController: PriceController;
  priceRouter: Router;

  addressRepository: IAddressRepository;
  addressController: AddressController;
  addressRouter: Router;

  blockcypherService: IBlockcypherService;
  blockchainController: BlockchainController;
  blockchainRouter: Router;

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
  myTask: asClass(MyTask).singleton(),
  updatePricesTask: asClass(UpdatePricesTask).singleton(),
  authMiddleware: asFunction((c) =>
    createAuthMiddleware(c.config.apiToken),
  ).singleton(),

  currencyRepository: asClass(SqliteCurrencyRepository).singleton(),
  currencyController: asClass(CurrencyController).singleton(),
  currencyRouter: asFunction(createCurrencyRouter).singleton(),

  priceRepository: asClass(SqlitePriceRepository).singleton(),

  binanceService: asClass(BinanceHttpService).singleton(),
  priceController: asClass(PriceController).singleton(),
  priceRouter: asFunction(createPriceRouter).singleton(),

  addressRepository: asClass(SqliteAddressRepository).singleton(),
  addressController: asClass(AddressController).singleton(),
  addressRouter: asFunction(createAddressRouter).singleton(),

  blockcypherService: asClass(BlockcypherService).singleton(),
  blockchainController: asClass(BlockchainController).singleton(),
  blockchainRouter: asFunction(createBlockchainRouter).singleton(),

  errorMiddleware: asFunction((c) =>
    createErrorMiddleware(c.logger),
  ).singleton(),

  app: asClass(App).singleton(),
});

export default container;
