const monkLogger = require('./monk-logger');

class MonkInspector {
  constructor(traceLogger, app) {
    this.dbList = [];
    this.traceLogger = traceLogger;
    this.app = app;
  }

  traceDB(db) {
    if (this.dbList.length === 0 && db.addMiddleware) {
      db.addMiddleware(monkLogger(this.traceLogger, this.app));
      this.dbList.push(db);
    }

    return db;
  }

  shutdown() {
    this.dbList.forEach((db) => {
      db.close();
    });
  }
}

module.exports = MonkInspector;
