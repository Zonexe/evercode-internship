import { LoggerType } from "../utils/logger";

export default class Scheduler {
  private logger: LoggerType;

  constructor(logger: LoggerType) {
    this.logger = logger;
  }

  startTask(
    name: string,
    interval: number,
    taskFunction: (logger: LoggerType) => void,
  ): void {
    this.logger(`Task "${name}" started with interval ${interval}ms`);

    setInterval(() => taskFunction(this.logger), interval);
  }
}
