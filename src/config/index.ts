interface AppConfig {
  appName: string;
  version: string;
  port: number;
}

const config: AppConfig = {
  appName: process.env.APP_NAME || "EvercodeInternshipApp",
  version: process.env.APP_VERSION || "1.0.0",
  port: Number(process.env.PORT) || 3000,
};

export default config;
