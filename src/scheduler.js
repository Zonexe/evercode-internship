const logger = require("./logger");

logger("scheduler.js has been initialized");

/**
@param {string} name 
@param {number} interval 
@param {function} task 
 */
const startTask = (name, interval, task) => {
  logger(`Task "${name}" started with interval ${interval}ms`);
  setInterval(task, interval);
};

module.exports = { startTask };
