const url = require('url');
const timeUtils = require('../util/time');
const cls = require('../cls');
const consts = require('../constants');

const TRACE_TYPE = 'mongo';

module.exports = (logger) => {
  return (context) => (next) => (args, method) => {
    const traceInfo = cls.get('traceInfo');
    if (!traceInfo) {
      return next(args, method);
    }
    const requestAt = new Date();
    const collection = context.collection.name;
    const db = url
      // eslint-disable-next-line no-underscore-dangle
      .parse(context.monkInstance._connectionURI)
      .pathname.replace('/', '');
    const traceMsg = {
      type: consts.LOG_TYPE_TRACE,
      service: traceInfo.service,
      trace_id: traceInfo.traceId,
      span: {
        type: 'monk',
        name: `${TRACE_TYPE}.${method}`,
        tags: {
          mongo_collection: collection,
          mongo_db: db,
        },
      },
      trace_timestamp: requestAt,
      request_type: `${TRACE_TYPE}.${method}`,
    };
    const startAt = process.hrtime();
    return next(args, method)
      .then((res) => {
        const duration = timeUtils.getElapsedMsFromHrtime(startAt, 6);
        if (traceInfo && logger) {
          traceMsg.duration = duration;
          logger.info(traceMsg);
        }
        return res;
      })
      .catch((err) => {
        if (logger) {
          const duration = timeUtils.getElapsedMsFromHrtime(startAt, 6);
          traceMsg.span.error = err;
          traceMsg.span.error_stack = err.stack;
          traceMsg.process_time = duration;
          logger.error(traceMsg);
        }

        throw err;
      });
  };
};
