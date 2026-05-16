export interface ILogger {
  log(message: string): void;
}

export class Logger implements ILogger {
  constructor(
    private readonly prefix: string,
    private readonly transport: (msg: string) => void = (msg) =>
      console.log(msg),
  ) {}

  public log(message: string): void {
    this.transport(`[${this.prefix}] - ${message}`);
  }
}
