import express, {
  Application,
  Request,
  Response,
  RequestHandler,
} from "express";
import { ILogger } from "./utils/logger";
import AppConfig from "./config";

export class App {
  public readonly expressApp: Application;
  private readonly logger: ILogger;
  private readonly config: typeof AppConfig;
  private readonly authMiddleware: RequestHandler;

  constructor({
    logger,
    config,
    authMiddleware,
  }: {
    logger: ILogger;
    config: typeof AppConfig;
    authMiddleware: RequestHandler;
  }) {
    this.logger = logger;
    this.config = config;
    this.authMiddleware = authMiddleware;

    this.expressApp = express();

    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.expressApp.get("/status", (req: Request, res: Response) => {
      res.send("ok");
    });

    this.expressApp.use(this.authMiddleware);

    this.expressApp.get("/protected-route", (req: Request, res: Response) => {
      res.json({ data: "secret data" });
    });
  }

  public start(): void {
    const port = this.config.port;
    this.expressApp.listen(port, () => {
      this.logger.info(`HTTP-сервер успешно запущен на порту ${port}`);
    });
  }
}
