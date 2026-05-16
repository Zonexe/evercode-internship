import { AppError } from "./AppError";

export class TaskExecutionError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 500, context);
  }
}
