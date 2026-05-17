import { ILogger } from "../utils/logger";

export const myPeriodicTask = (logger: ILogger): void => {
  logger.info("Задача выполняется...");
};