import { ILogger } from "../utils/logger";
import { TaskExecutionError } from "../errors/TaskExecutionError";

export class Scheduler {
  private intervals: NodeJS.Timeout[] = [];

  constructor(public logger: ILogger) {}

  startTask(
    name: string,
    interval: number,
    taskFunction: (logger: ILogger) => void,
  ): void {
    this.logger.info(`Task "${name}" started with interval ${interval}ms`);

    const id = setInterval(() => {
      try {
        taskFunction(this.logger);
      } catch (error) {
        const wrappedError = new TaskExecutionError(
          error instanceof Error ? error.message : "Unknown task error",
          { taskName: name, originalError: error },
        );

        this.logger.error(`${wrappedError.name}: ${wrappedError.message}`, {
          context: wrappedError.context,
        });
      }
    }, interval);

    this.intervals.push(id);
  }

  public stopAll(): void {
    this.intervals.forEach(clearInterval);
    this.intervals = [];
  }
}
