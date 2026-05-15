export type LoggerType = (message: string) => void;

export const createLogger = (prefix: string): LoggerType => {
  return (message: string) => {
    console.log(`[${prefix}] - ${message}`);
  };
};
