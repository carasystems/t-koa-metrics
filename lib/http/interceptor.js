const https = require('https');
const http = require('http');
const debug = require('debug')('http-interceptor');
const { inject } = require('./request');

module.exports.inject = (options) => {
  const protocols = ['http', 'https'];

  protocols.forEach((protocol) => {
    const netModule = protocol === 'https' ? https : http;
    const { request: originalRequest } = netModule;

    // refer: https://nodejs.org/api/http.html
    function injectRequest(...args) {
      const req = originalRequest(...args);
      // we can not get host from the request object
      let host = 'unknown';
      if (typeof args[0] === 'string') {
        // call with url
        const urlObj = new URL(args[0]);
        host = urlObj.host;
      } else {
        host = args[0].host;
      }

      if (!host) {
        host = args[0].hostname;
      }
      inject(req, protocol, host, options);

      return req;
    }

    netModule.request = injectRequest;

    netModule.get = (...args) => {
      debug('%s.get', protocol, args);
      const req = injectRequest(...args);
      req.end();
      return req;
    };
  });
};
