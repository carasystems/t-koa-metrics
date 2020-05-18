/* eslint-env node, mocha */

const monk = require('monk');
const chai = require('chai');
const uuid = require('uuid');
const spies = require('chai-spies');
const bunyan = require('bunyan');
const cls = require('../../lib/global/cls');

chai.use(spies);
const { expect } = chai;
const logger = bunyan.createLogger({
  name: 'test-logger',
});

const monkLogger = require('../../lib/monk/monk-logger');

const demoDb = monk('mongodb://localhost:27017/demo');
const spyedMonkTracer = chai.spy(
  monkLogger({
    logger,
  })
);

demoDb.addMiddleware(spyedMonkTracer);
const brokerCol = demoDb.get('broker2222');

describe('monk tracer tests', () => {
  after((done) => {
    demoDb.close();
    done();
  });

  it('should works', async () => {
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
      expect(spyedMonkTracer).to.have.been.called.exactly(1);
    });
  });
});
