const monkLogger = require('./monk-logger');

class MonkInspector {
  constructor(traceLogger) {
    this.dbList = [];
    this.traceLogger = traceLogger;
  }

  traceDB(db) {
    if (this.dbList.length === 0 && db.addMiddleware) {
      db.addMiddleware(monkLogger(this.traceLogger));
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
