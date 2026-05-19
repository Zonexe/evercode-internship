import { ILogger } from "../utils/logger";

export class MyTask {
  private readonly logger: ILogger;

  constructor({ logger }: { logger: ILogger }) {
    this.logger = logger;
  }

  public execute(): void {
    this.logger.info("Задача выполняется...");
  }
}
