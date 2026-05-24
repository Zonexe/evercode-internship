import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import request from "supertest";
import { App } from "./app";
import { ILogger } from "./utils/logger";
import config from "./config";

describe("App (Integration)", () => {
  let loggerMock: ILogger;
  let appInstance: App;

  beforeEach(() => {
    loggerMock = {
      trace: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    appInstance = new App({
      logger: loggerMock,
      config: config,
    });
  });

  describe("GET /status", () => {
    it("should return status 200 and text 'ok'", async () => {
      const response = await request(appInstance.expressApp).get("/status");

      expect(response.status).toBe(200);

      expect(response.text).toBe("ok");
    });
  });
});
