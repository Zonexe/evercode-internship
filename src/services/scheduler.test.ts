import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";
import type { MockedObject } from "jest-mock";
import { Scheduler, ITask } from "./scheduler";
import { ILogger } from "../utils/logger";

describe("Scheduler", () => {
  let loggerMock: MockedObject<ILogger>;
  let scheduler: Scheduler;

  beforeEach(() => {
    jest.useFakeTimers();

    loggerMock = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      trace: jest.fn(),
    } as MockedObject<ILogger>;

    scheduler = new Scheduler(loggerMock);
  });

  afterEach(async () => {
    await scheduler.stopAll();
    jest.useRealTimers();
  });

  it("должен выполнять задачу ровно один раз после одного интервала", async () => {
    const taskMock: ITask = {
      execute: jest.fn(() => {}),
    };

    const INTERVAL = 10_000;

    scheduler.startTask("TestTask", INTERVAL, taskMock);

    expect(taskMock.execute).not.toHaveBeenCalled();

    await jest.advanceTimersByTimeAsync(INTERVAL);

    expect(taskMock.execute).toHaveBeenCalledTimes(1);
    expect(loggerMock.info).toHaveBeenCalledWith(
      expect.stringContaining("TestTask"),
    );
  });

  it("должен выполнять задачу N раз после N интервалов", async () => {
    const taskMock: ITask = {
      execute: jest.fn(() => {}),
    };

    const INTERVAL = 10_000;
    const TICKS = 3;

    scheduler.startTask("RepeatingTask", INTERVAL, taskMock);

    await jest.advanceTimersByTimeAsync(INTERVAL * TICKS);

    expect(taskMock.execute).toHaveBeenCalledTimes(TICKS);
  });

  it("не должен запускать задачу повторно, пока предыдущий запуск не завершён", async () => {
    const resolvers: Array<() => void> = [];

    const taskMock: ITask = {
      execute: jest.fn(
        () =>
          new Promise<void>((resolve) => {
            resolvers.push(resolve);
          }),
      ),
    };

    const INTERVAL = 1_000;

    scheduler.startTask("LongTask", INTERVAL, taskMock);

    await jest.advanceTimersByTimeAsync(INTERVAL);

    expect(taskMock.execute).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(INTERVAL * 3);

    expect(taskMock.execute).toHaveBeenCalledTimes(1);

    resolvers[0]();

    await Promise.resolve();
    await Promise.resolve();

    await jest.advanceTimersByTimeAsync(INTERVAL);

    expect(taskMock.execute).toHaveBeenCalledTimes(2);

    resolvers[1]();

    await scheduler.stopAll();
  });

  it("должен ждать завершения активной задачи при остановке", async () => {
    let resolveTask: (() => void) | undefined;

    const taskMock: ITask = {
      execute: jest.fn(
        () =>
          new Promise<void>((resolve) => {
            resolveTask = resolve;
          }),
      ),
    };

    scheduler.startTask("LongTask", 1_000, taskMock);

    await jest.advanceTimersByTimeAsync(1_000);

    expect(taskMock.execute).toHaveBeenCalledTimes(1);

    let shutdownFinished = false;

    const shutdownPromise = scheduler.stopAll().then(() => {
      shutdownFinished = true;
    });

    await Promise.resolve();

    expect(shutdownFinished).toBe(false);

    resolveTask?.();

    await shutdownPromise;

    expect(shutdownFinished).toBe(true);
  });

  it("не должен запускать новые задачи после остановки", async () => {
    const taskMock: ITask = {
      execute: jest.fn(() => {}),
    };

    const INTERVAL = 1_000;

    scheduler.startTask("StoppedTask", INTERVAL, taskMock);

    await scheduler.stopAll();

    await jest.advanceTimersByTimeAsync(INTERVAL * 3);

    expect(taskMock.execute).not.toHaveBeenCalled();
  });

  it("должен логировать ошибку с именем задачи, если задача выбрасывает исключение", async () => {
    const INTERVAL = 1_000;

    const errorTask: ITask = {
      execute: jest.fn(() => {
        throw new Error("Boom!");
      }),
    };

    scheduler.startTask("ErrorTask", INTERVAL, errorTask);

    await jest.advanceTimersByTimeAsync(INTERVAL);

    expect(errorTask.execute).toHaveBeenCalledTimes(1);

    expect(loggerMock.error).toHaveBeenCalledWith(
      expect.stringContaining("TaskExecutionError"),
      expect.objectContaining({
        context: expect.objectContaining({
          taskName: "ErrorTask",
        }),
      }),
    );
  });

  it("должен логировать неизвестную ошибку, если задача выбрасывает не Error", async () => {
    const INTERVAL = 1_000;

    const errorTask: ITask = {
      execute: jest.fn(() => {
        throw "unexpected error";
      }),
    };

    scheduler.startTask("UnknownErrorTask", INTERVAL, errorTask);

    await jest.advanceTimersByTimeAsync(INTERVAL);

    expect(loggerMock.error).toHaveBeenCalledWith(
      expect.stringContaining("TaskExecutionError"),
      expect.objectContaining({
        context: expect.objectContaining({
          taskName: "UnknownErrorTask",
          originalError: "unexpected error",
        }),
      }),
    );
  });
});
