const uuid = require('uuid');
const methods = require('methods');
const extend = require('extend');
const cls = require('../cls');
const { inject } = require('./request');

const TEN_SECONDS_IN_MS = 10 * 1000;

function wrapRequest(options) {
  return (req) => {
    req.timeout({
      deadline: TEN_SECONDS_IN_MS,
    });

    const traceInfo = cls.get('traceInfo');
    let requestId = traceInfo ? traceInfo.traceId : null;
    if (!requestId) {
      requestId = uuid.v4();
    }

    const urlObj = new URL(req.url);

    req.path = `${urlObj.pathname}${urlObj.search}`;

    inject(req, urlObj.protocol, urlObj.host, options);

    return req;
  };
}

module.exports.inject = (options) => {
  try {
    // eslint-disable-next-line global-require
    const superagent = require('superagent');
    const httpMethods = methods.slice(0);

    if (httpMethods.indexOf('del') === -1) {
      httpMethods.push('del');
    }

    const agent = extend({}, superagent);
    httpMethods.forEach((method) => {
      // eslint-disable-next-line func-names
      superagent[method] = (...args) => {
        // eslint-disable-next-line prefer-rest-params
        const request = agent[method].apply(superagent, args);
        return request.use(wrapRequest(options));
      };
    });
  } catch (err) {
    // Do nothing
  }
};
