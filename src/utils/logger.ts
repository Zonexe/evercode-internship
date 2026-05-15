export type LoggerType = (message: string) => void;
export type Transport = (msg: string) => void;

export const createLogger = (
  prefix: string,
  transport: Transport = (msg) => console.log(msg),
): LoggerType => {
  return (message: string) => {
    transport(`[${prefix}] - ${message}`);
  };
};
