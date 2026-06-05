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

  afterEach(() => {
    scheduler.stopAll();
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
        context: expect.objectContaining({ taskName: "ErrorTask" }),
      }),
    );
  });
});
