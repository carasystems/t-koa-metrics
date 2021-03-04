const monkLogger = require('./monk-logger');

class MonkInspector {
  constructor(traceLogger) {
    this.dbList = [];
    this.traceLogger = traceLogger;
    this.isShutdown = false;
  }

  traceDB(db) {
    if (this.dbList.length === 0 && db.addMiddleware) {
      db.addMiddleware(monkLogger(this.traceLogger));
      this.dbList.push(db);
    }

    return db;
  }

  shutdown() {
    if (this.isShutdown) {
      return;
    }

    this.dbList.forEach((db) => {
      db.close();
    });
    this.isShutdown = true;
  }
}

module.exports = MonkInspector;
