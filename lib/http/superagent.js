const superagent = require('superagent');
const menthods = require('methods');
const uuid = require('uuid');
const cls = require('../cls');
const timeUtils = require('../util/time');
const consts = require('../constants');

function buildLog(requestId, traceInfo, req) {
  const requestAt = traceInfo ? traceInfo.requestAt : new Date();
  return {
    type: consts.LOG_TYPE_TRACE,
    trace_id: requestId,
    span: {
      type: 'http',
      name: `${req.method} ${req.url}`,
      tags: {
        http_method: req.method,
      },
    },
    trace_timestamp: requestAt,
  };
}

function wrapRequest(traceLogger) {
  return (req) => {
    const startAt = process.hrtime();
    const traceInfo = cls.get('traceInfo');
    let requestId = traceInfo ? traceInfo.traceId : null;
    if (!requestId) {
      requestId = uuid.v4();
    }

    req.header[consts.HTTP_HEADER_TRACE_ID] = requestId;

    const logMsg = traceLogger ? buildLog(requestId, traceInfo, req) : null;

    function calElapsedTime() {
      return timeUtils.getElapsedMsFromHrtime(startAt, 6);
    }

    req.on('error', (err) => {
      if (logMsg) {
        logMsg.span.error = err;
        logMsg.span.tags.status_code = err.status;
        logMsg.span.error_stack = err.stack;
        logMsg.process_time = calElapsedTime();
        logMsg.duration = logMsg.process_time;
        traceLogger.error(logMsg);
      }
    });

    req.on('response', (res) => {
      if (res.statusCode < 400 && logMsg) {
        logMsg.span.tags.status_code = res.statusCode;
        logMsg.process_time = calElapsedTime();
        logMsg.duration = logMsg.process_time;
        traceLogger.info(logMsg);
      }
    });

    return req;
  };
}

const TEN_SECONDS_IN_MS = 10 * 1000;

module.exports.create = (traceLogger) => {
  const wrapped = {};

  menthods.forEach((method) => {
    // eslint-disable-next-line func-names
    wrapped[method] = function () {
      // eslint-disable-next-line prefer-rest-params,prefer-spread
      const request = superagent[method].apply(superagent, arguments);

      if (traceLogger) {
        request.use(wrapRequest(traceLogger));
      }

      request.timeout({
        deadline: TEN_SECONDS_IN_MS,
      });

      return request;
    };
  });

  wrapped.del = wrapped.delete;

  return wrapped;
};
