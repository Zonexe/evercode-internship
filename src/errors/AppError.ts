export class AppError extends Error {
  public readonly name: string;
  public readonly isOperational: boolean;

  constructor(message: string, name: string, isOperational = true) {
    super(message);
    this.name = name;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}
