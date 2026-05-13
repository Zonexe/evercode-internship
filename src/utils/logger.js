const createLogger = (prefix) => {
  return (message) => {
    console.log(`[${prefix}] - ${message}`);
  };
};

module.exports = { createLogger };
