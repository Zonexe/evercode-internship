export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
}

export type LogTransport = (message: string) => void;

export interface ILogger {
  trace(message: string, context?: Record<string, unknown>): void;
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

export interface LoggerOptions {
  prefix: string;
  requestId?: string;
  minLevel?: LogLevel;
  transport?: LogTransport;
}

function formatLogMessage(
  level: LogLevel,
  prefix: string,
  message: string,
  requestId?: string,
  context?: Record<string, unknown>,
): string {
  const timestamp = new Date().toISOString();
  const levelName = LogLevel[level];
  const rid = requestId ? ` [RID:${requestId}]` : "";
  const ctx = context ? ` | Context: ${JSON.stringify(context)}` : "";

  return `${timestamp} [${levelName}] [${prefix}]${rid} - ${message}${ctx}`;
}

export class Logger implements ILogger {
  private readonly prefix: string;
  private readonly requestId?: string;
  private readonly minLevel: LogLevel;
  private readonly transport: LogTransport;

  constructor({
    prefix,
    requestId,
    minLevel = LogLevel.INFO,
    transport = console.log,
  }: LoggerOptions) {
    this.prefix = prefix;
    this.requestId = requestId;
    this.minLevel = minLevel;
    this.transport = transport;
  }

  private log(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
  ): void {
    if (level < this.minLevel) return;

    this.transport(
      formatLogMessage(level, this.prefix, message, this.requestId, context),
    );
  }

  trace(msg: string, ctx?: Record<string, unknown>): void {
    this.log(LogLevel.TRACE, msg, ctx);
  }
  debug(msg: string, ctx?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, msg, ctx);
  }
  info(msg: string, ctx?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, msg, ctx);
  }
  warn(msg: string, ctx?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, msg, ctx);
  }
  error(msg: string, ctx?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, msg, ctx);
  }
}
