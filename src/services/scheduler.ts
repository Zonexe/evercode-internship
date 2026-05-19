import { ILogger } from "../utils/logger";
import { TaskExecutionError } from "../errors/TaskExecutionError";

export interface ITask {
  execute(): void;
}

export class Scheduler {
  private intervals: NodeJS.Timeout[] = [];

  constructor(private readonly logger: ILogger) {}

  public startTask(name: string, interval: number, task: ITask): void {
    this.logger.info(`Task "${name}" started with interval ${interval}ms`);

    const id = setInterval(() => {
      try {
        task.execute();
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
