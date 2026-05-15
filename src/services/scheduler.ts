import { ILogger } from "../utils/logger";

export default class Scheduler {
  constructor(private logger: ILogger) {}

  startTask(
    name: string,
    interval: number,
    taskFunction: (logger: ILogger) => void,
  ): void {
    this.logger.log(`Task "${name}" started with interval ${interval}ms`);

    setInterval(() => taskFunction(this.logger), interval);
  }
}
