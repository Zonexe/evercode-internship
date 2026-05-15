import { LoggerType } from "../utils/logger";

export const myPeriodicTask = (logger: LoggerType): void => {
  logger("Задача выполняется...)");
};
