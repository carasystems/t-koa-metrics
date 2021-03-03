/* eslint-env node, mocha */

const monk = require('monk');
const chai = require('chai');
const uuid = require('uuid');
const sinon = require('sinon');
const bunyan = require('bunyan');
const cls = require('../../lib/cls');

const { expect } = chai;
const logger = bunyan.createLogger({
  name: 'test-logger',
});

const monkLogger = require('../../lib/monk/monk-logger');

const demoDb = monk('mongodb://localhost:27017/demo');

const monkLoggerMW = monkLogger(logger);

demoDb.addMiddleware(monkLoggerMW);
const brokerCol = demoDb.get('broker2222');

describe('monk tracer tests', () => {
  const sandbox = sinon.createSandbox();

  after((done) => {
    demoDb.close();
    sandbox.restore();
    done();
  });

  it('should works', async () => {
    const stub = sandbox.stub(logger, 'info');
    return new Promise(
      cls.bind((resolve, reject) => {
        cls.set('traceInfo', {
          traceId: uuid.v4(),
        });

        brokerCol
          .find({
            name: 'abc',
          })
          .then(resolve)
          .catch(reject);
      })
    ).then(() => {
      expect(stub.callCount).to.equal(1);
    });
  });
});
