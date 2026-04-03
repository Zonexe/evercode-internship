const { appName } = require("./config");

const logger = (message) => {
  console.log(`[${appName}] - ${message}`);
};

module.exports = logger;
