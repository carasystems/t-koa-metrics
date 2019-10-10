const bunyan = require('bunyan');

exports.createLogger = name => bunyan.createLogger({ name, serializers: bunyan.stdSerializers });
