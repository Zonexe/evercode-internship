const logger = require("./logger");
const { startTask } = require('./scheduler');

logger("Приложение успешно запущено!");

startTask('MyPeriodicTask', 10000, () => {
    logger('running');
});