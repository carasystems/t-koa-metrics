const bunyan = require('bunyan');

module.exports.createLogger = (name) => bunyan.createLogger({ name, serializers: bunyan.stdSerializers });
