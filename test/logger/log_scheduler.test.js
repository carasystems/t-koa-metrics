/* eslint-env node, mocha */

const chai = require('chai');
const spies = require('chai-spies');

chai.use(spies);
const { expect } = chai;

const { LogScheduler } = require('../../lib/logger');

describe('log scheduler tests', () => {
  it('should register works', () => {
    const spiedLogger = {
      // eslint-disable-next-line no-console
      info: chai.spy(console.log),
      // eslint-disable-next-line no-console
      error: chai.spy(console.error),
    };

    const logScheduler = new LogScheduler(30, spiedLogger);

    logScheduler.register((logger) => {
      logger.info('foo');
    });

    logScheduler.start();

    return new Promise((resolve) => {
      setTimeout(() => {
        logScheduler.shutdown();
        expect(spiedLogger.info).to.have.been.called.exactly(1);
        resolve();
      }, 50);
    });
  });
});
