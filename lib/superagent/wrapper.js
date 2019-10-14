const superagent = require('superagent');
const menthods = require('methods');
const cls = require('../global/cls');
const utils = require('../utils');
const consts = require('../global/constants');

function buildLog(requestId, traceInfo, req) {
  if (!traceInfo) {
    return null;
  }
  return {
    type: consts.LOG_TYPE_TRACE,
    app: traceInfo.app,
    trace_id: requestId,
    span: {
      type: 'http',
      name: `${req.method} ${req.url}`,
      tags: {
        http_method: req.method,
      },
    },
    trace_timestamp: traceInfo.requestAt,
  };
}

function wrapRequest(options) {
  return (req) => {
    const startAt = process.hrtime();
    const traceInfo = cls.get('traceInfo');
    const requestId = traceInfo.traceId;
    if (requestId) {
      req.header[consts.HTTP_HEADER_TRACE_ID] = requestId;
    }

    const logMsg = options.logger ? buildLog(requestId, traceInfo, req) : null;

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

module.exports.create = (options) => {
  const wrapped = {};

  menthods.forEach((method) => {
    // eslint-disable-next-line func-names
    wrapped[method] = function () {
      // eslint-disable-next-line prefer-rest-params,prefer-spread
      const request = superagent[method].apply(superagent, arguments);
      request.use(wrapRequest(options));
      return request;
    };
  });

  return wrapped;
};
