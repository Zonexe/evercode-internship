import { ILogger } from "../utils/logger";

export class MyTask {
  constructor(private readonly logger: ILogger) {}

  public execute(): void {
    this.logger.info("Задача выполняется...");
  }
}
