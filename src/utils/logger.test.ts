import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { Logger, LogLevel } from "./logger";

describe("Logger", () => {
  let transportMock: jest.Mock<(msg: string) => void>;
  let logger: Logger;

  beforeEach(() => {
    transportMock = jest.fn();
    logger = new Logger({
      prefix: "TestApp",
      transport: transportMock,
      minLevel: LogLevel.INFO,
    });
  });

  it("should call the transport with a formatted message when logging at INFO level", () => {
    logger.info("Hello World");

    expect(transportMock).toHaveBeenCalledTimes(1);
    expect(transportMock).toHaveBeenCalledWith(
      expect.stringMatching(/\[INFO\].*Hello World/),
    );
  });

  it("should NOT call the transport if level is below minLevel", () => {
    logger.debug("Hidden message");

    expect(transportMock).not.toHaveBeenCalled();
  });
});
