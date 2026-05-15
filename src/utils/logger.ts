export interface ILogger {
  log(message: string): void;
}

export class ConsoleLogger implements ILogger {
  constructor(
    private prefix: string,
    private transport: (msg: string) => void = (msg) => console.log(msg),
  ) {}

  log(message: string): void {
    this.transport(`[${this.prefix}] - ${message}`);
  }
}
