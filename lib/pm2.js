const cron = require('cron');
const pm2 = require('pm2');

function getPm2Info(appName) {
  return new Promise((resolve, reject) => {
    pm2.connect((err) => {
      if (err) {
        reject(err);
      }

      pm2.describe(appName, (error, processDescription) => {
        if (error) {
          return reject(err);
        }

        let description = null;
        if (processDescription && processDescription.length > 0) {
          [description] = [processDescription[0]];
        }

        if (description == null) {
          return resolve({});
        }

        const pm2Env = description.pm2_env || {};
        const axmMonitor = pm2Env.axm_monitor || {};
        const pmMetrics = {
          active_request: axmMonitor['Active requests'].value,
          active_handlers: axmMonitor['Active handles'].value,
          event_loop_latency: axmMonitor['Event Loop Latency'].value,
          event_loop_latency_p95: axmMonitor['Event Loop Latency p95'].value,
        };
        return resolve(pmMetrics);
      });
    });
  });
}

class Pm2Monitor {
  constructor(options) {
    this.appName = options.app;
    this.logger = options.logger;
    const that = this;
    this.cron = new cron.CronJob(
      `*/${options.monitorInterval} * * * * *`,
      () => {
        that.print();
      },
      null,
      false
    );
  }

  start() {
    this.cron.start();
  }

  print() {
    getPm2Info(this.appName)
      .then((metrics) => {
        this.logger.info({
          type: 'pm2-metrics',
          ...metrics,
        });
      })
      .catch(() => {
        // ignore
      });
  }
}

module.exports.createMonitor = (opts) =>
  new Pm2Monitor({
    app: 'thimble-koa-metrics',
    monitorInterval: 5,
    ...opts,
  });
