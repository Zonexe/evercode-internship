import { ILogger } from "../utils/logger";
import { ITask } from "../services/scheduler";

export class MyTask implements ITask {
  private readonly logger: ILogger;

  constructor({ logger }: { logger: ILogger }) {
    this.logger = logger;
  }

  public execute(): void {
    this.logger.info("Задача выполняется...");
  }
}
