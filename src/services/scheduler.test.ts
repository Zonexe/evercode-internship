import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";
import type { MockedObject } from "jest-mock";
import { Scheduler } from "./scheduler";
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

  it("должен выполнять задачу ровно один раз после одного интервала", () => {
    const taskMock = {
      execute: jest.fn(),
    };
    const INTERVAL = 10_000;

    scheduler.startTask("TestTask", INTERVAL, taskMock);

    expect(taskMock.execute).not.toHaveBeenCalled();

    jest.advanceTimersByTime(INTERVAL);

    expect(taskMock.execute).toHaveBeenCalledTimes(1);
    expect(loggerMock.info).toHaveBeenCalledWith(
      expect.stringContaining("TestTask"),
    );
  });

  it("должен выполнять задачу N раз после N интервалов", () => {
    const taskMock = {
      execute: jest.fn(),
    };
    const INTERVAL = 10_000;
    const TICKS = 3;

    scheduler.startTask("RepeatingTask", INTERVAL, taskMock);

    jest.advanceTimersByTime(INTERVAL * TICKS);

    expect(taskMock.execute).toHaveBeenCalledTimes(TICKS);
  });

  it("должен логировать ошибку с именем задачи, если задача выбрасывает исключение", () => {
    const INTERVAL = 1_000;
    const errorTask = {
      execute: jest.fn().mockImplementation(() => {
        throw new Error("Boom!");
      }),
    };

    scheduler.startTask("ErrorTask", INTERVAL, errorTask);

    jest.advanceTimersByTime(INTERVAL);

    expect(errorTask.execute).toHaveBeenCalledTimes(1);

    expect(loggerMock.error).toHaveBeenCalledWith(
      expect.stringContaining("TaskExecutionError"),
      expect.objectContaining({
        context: expect.objectContaining({ taskName: "ErrorTask" }),
      }),
    );
  });
});
