class Scheduler {
  constructor(logger) {
    this.logger = logger;
  }

  startTask(name, interval, taskFunction) {
    this.logger(`Task "${name}" started with interval ${interval}ms`);

    setInterval(() => taskFunction(this.logger), interval);
  }
}

module.exports = Scheduler;
