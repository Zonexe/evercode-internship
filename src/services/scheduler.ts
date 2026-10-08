import { ILogger } from "../utils/logger";
import { TaskExecutionError } from "../errors/TaskExecutionError";

export interface ITask {
  execute(): void | Promise<void>;
}

interface ScheduledTask {
  name: string;
  timer: NodeJS.Timeout;
  activeExecution?: Promise<void>;
}

export class Scheduler {
  private readonly tasks = new Set<ScheduledTask>();
  private isStopping = false;

  constructor(private readonly logger: ILogger) {}

  public startTask(name: string, interval: number, task: ITask): void {
    if (this.isStopping) {
      throw new Error("Нельзя запускать задачи после остановки планировщика.");
    }

    if (!Number.isFinite(interval) || interval <= 0) {
      throw new Error("Интервал задачи должен быть положительным числом.");
    }

    const scheduledTask: ScheduledTask = {
      name,
      timer: setInterval(() => {
        if (this.isStopping || scheduledTask.activeExecution) {
          return;
        }

        const execution = this.executeTask(name, task);
        scheduledTask.activeExecution = execution;

        void execution.then(() => {
          if (scheduledTask.activeExecution === execution) {
            scheduledTask.activeExecution = undefined;
          }
        });
      }, interval),
    };

    this.tasks.add(scheduledTask);

    this.logger.info(`Task "${name}" started with interval ${interval}ms`);
  }

  private async executeTask(name: string, task: ITask): Promise<void> {
    try {
      await task.execute();
    } catch (error) {
      const wrappedError = new TaskExecutionError(
        error instanceof Error ? error.message : "Unknown task error",
        {
          taskName: name,
          originalError: error,
        },
      );

      this.logger.error(`${wrappedError.name}: ${wrappedError.message}`, {
        context: wrappedError.context,
      });
    }
  }

  public async stopAll(): Promise<void> {
    if (this.isStopping) {
      await Promise.all(
        [...this.tasks].flatMap((task) =>
          task.activeExecution ? [task.activeExecution] : [],
        ),
      );
      return;
    }

    this.isStopping = true;

    for (const task of this.tasks) {
      clearInterval(task.timer);
    }

    this.logger.info("Ожидание завершения активных фоновых задач...");

    await Promise.all(
      [...this.tasks].flatMap((task) =>
        task.activeExecution ? [task.activeExecution] : [],
      ),
    );

    this.tasks.clear();

    this.logger.info("Все фоновые задачи остановлены.");
  }
}
