import { ILogger } from "../utils/logger";
import { TaskExecutionError } from "../errors/TaskExecutionError";

export default class Scheduler {
  constructor(public logger: ILogger) {}

  startTask(
    name: string,
    interval: number,
    taskFunction: (logger: ILogger) => void,
  ): void {
    this.logger.log(`Task "${name}" started with interval ${interval}ms`);

    setInterval(() => {
      try {
        taskFunction(this.logger);
      } catch (error) {
        const wrappedError = new TaskExecutionError(
          error instanceof Error ? error.message : "Unknown task error",
          { taskName: name, originalError: error },
        );
        this.logger.log(
          `[Error] ${wrappedError.name}: ${wrappedError.message} | Context: ${JSON.stringify(wrappedError.context)}`,
        );
      }
    }, interval);
  }
}
