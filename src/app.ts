import express, {
  Application,
  Request,
  Response,
  RequestHandler,
  ErrorRequestHandler,
  Router,
} from "express";
import { ILogger } from "./utils/logger";
import { config as AppConfig } from "./config";
import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import swaggerUi from "swagger-ui-express";

export class App {
  public readonly expressApp: Application;
  private readonly logger: ILogger;
  private readonly config: typeof AppConfig;
  private readonly authMiddleware: RequestHandler;
  private readonly currencyRouter: Router;
  private readonly priceRouter: Router;
  private readonly errorMiddleware: ErrorRequestHandler;

  constructor({
    logger,
    config,
    authMiddleware,
    currencyRouter,
    priceRouter,
    errorMiddleware,
  }: {
    logger: ILogger;
    config: typeof AppConfig;
    authMiddleware: RequestHandler;
    currencyRouter: Router;
    priceRouter: Router;
    errorMiddleware: ErrorRequestHandler;
  }) {
    this.logger = logger;
    this.config = config;
    this.authMiddleware = authMiddleware;
    this.currencyRouter = currencyRouter;
    this.priceRouter = priceRouter;
    this.errorMiddleware = errorMiddleware;

    this.expressApp = express();

    this.expressApp.use(express.json());

    this.setupRoutes();
  }

  private setupRoutes(): void {
    try {
      const swaggerDocumentPath = path.join(
        process.cwd(),
        "openapi",
        "openapi.yaml",
      );

      const fileContents = fs.readFileSync(swaggerDocumentPath, "utf8");
      const swaggerDocument = yaml.load(fileContents) as Record<string, any>;

      this.expressApp.use(
        "/api-docs",
        swaggerUi.serve,
        swaggerUi.setup(swaggerDocument),
      );
      this.logger.info(
        "Документация OpenAPI успешно смонтирована на роут /api-docs",
      );
    } catch (error) {
      this.logger.error("Не удалось инициализировать документация OpenAPI", {
        context: {
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }

    this.expressApp.get("/status", (req: Request, res: Response) => {
      res.send("ok");
    });

    this.expressApp.use(this.authMiddleware);

    this.expressApp.get("/protected-route", (req: Request, res: Response) => {
      res.json({ data: "secret data" });
    });

    this.expressApp.use("/currencies", this.currencyRouter);
    this.expressApp.use("/price", this.priceRouter);

    this.expressApp.use(this.errorMiddleware);
  }

  public start(): void {
    const port = this.config.port;
    this.expressApp.listen(port, () => {
      this.logger.info(`HTTP-сервер успешно запущен на порту ${port}`);
    });
  }
}
