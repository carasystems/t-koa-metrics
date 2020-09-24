const os = require('os');

exports.loadavg1m = () => os.loadavg()[0];
exports.loadavg5m = () => os.loadavg()[1];
exports.loadavg15m = () => os.loadavg()[2];
exports.freemem = () => os.freemem();
exports.totalmem = () => os.totalmem();
