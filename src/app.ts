import express, { Application, Request, Response } from "express";
import { ILogger } from "./utils/logger";
import AppConfig from "./config";

export class App {
  public readonly expressApp: Application;
  private readonly logger: ILogger;
  private readonly config: typeof AppConfig;

  constructor({
    logger,
    config,
  }: {
    logger: ILogger;
    config: typeof AppConfig;
  }) {
    this.logger = logger;
    this.config = config;

    this.expressApp = express();

    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.expressApp.get("/status", (req: Request, res: Response) => {
      res.send("ok");
    });
  }

  public start(): void {
    const port = this.config.port;

    this.expressApp.listen(port, () => {
      this.logger.info(`HTTP-сервер успешно запущен на порту ${port}`);
    });
  }
}
