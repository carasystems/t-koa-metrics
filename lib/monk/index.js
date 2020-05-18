const monkLogger = require('./monk-logger');

class MonkInspector {
  constructor(options) {
    this.options = options;
    this.dbList = [];
  }

  traceDB(db) {
    if (this.dbList.length === 0 && db.addMiddleware) {
      db.addMiddleware(monkLogger(this.options));
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
