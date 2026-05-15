import { ILogger } from "../utils/logger";

export const myPeriodicTask = (logger: ILogger): void => {
  logger.log("Задача выполняется...");
};
