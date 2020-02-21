const superagent = require('superagent');
const menthods = require('methods');
const uuid = require('uuid');
const cls = require('../global/cls');
const utils = require('../utils');
const consts = require('../global/constants');

function buildLog(requestId, traceInfo, options, req) {
  if (!traceInfo && !options) {
    return null;
  }
  const app = traceInfo ? traceInfo.app : options.app;
  const requestAt = traceInfo ? traceInfo.requestAt : new Date();
  return {
    type: consts.LOG_TYPE_TRACE,
    app,
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

function wrapRequest(options) {
  return (req) => {
    const startAt = process.hrtime();
    const traceInfo = cls.get('traceInfo');
    let requestId = traceInfo ? traceInfo.traceId : null;
    if (!requestId) {
      requestId = uuid.v4();
    }

    req.header[consts.HTTP_HEADER_TRACE_ID] = requestId;

    const logMsg = options.logger ? buildLog(requestId, traceInfo, options, req) : null;

    function calElapsedTime() {
      return utils.getElapsedMsFromHrtime(startAt, 6);
    }

    req.on('error', (err) => {
      if (logMsg) {
        logMsg.span.error = err;
        logMsg.span.tags.status_code = err.status;
        logMsg.span.error_stack = err.stack;
        logMsg.process_time = calElapsedTime();
        options.logger.error(logMsg);
      }
    });

    req.on('response', (res) => {
      if (res.statusCode < 400 && logMsg) {
        logMsg.span.tags.status_code = res.statusCode;
        logMsg.process_time = calElapsedTime();
        options.logger.info(logMsg);
      }
    });

    return req;
  };
}

const TEN_SECONDS_IN_MS = 10 * 1000;

module.exports.create = (options) => {
  const wrapped = {};

  menthods.forEach((method) => {
    // eslint-disable-next-line func-names
    wrapped[method] = function () {
      // eslint-disable-next-line prefer-rest-params,prefer-spread
      const request = superagent[method].apply(superagent, arguments);
      request.use(wrapRequest(options));
      request.timeout().timeout({
        deadline: TEN_SECONDS_IN_MS,
      });
      return request;
    };
  });

  wrapped.del = wrapped.delete;

  return wrapped;
};
