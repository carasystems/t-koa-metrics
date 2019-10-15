/* eslint-env node, mocha */
const uuid = require('uuid');
const co = require('co');
const chai = require('chai');
const spies = require('chai-spies');
const cls = require('../lib/global/cls');

chai.use(spies);
const { expect } = chai;

function infoLogger() {
  // eslint-disable-next-line prefer-rest-params
  const args = Array.prototype.slice.call(arguments);
  // eslint-disable-next-line no-console
  console.log.apply(this, args);
}

function errorLogger() {
  // eslint-disable-next-line prefer-rest-params
  const args = Array.prototype.slice.call(arguments);
  // eslint-disable-next-line no-console
  console.error.apply(this, args);
}

const logger = {
  info: chai.spy(infoLogger),
  error: chai.spy(errorLogger),
};
const methodWrapper = require('../lib/method/wrapper')
  .create({
    logger,
  });


function testMethod(a, b) {
  return a + b;
}

function* testAsyncMethod(a, b) {
  return yield new Promise((resolve) => {
    setTimeout(() => {
      resolve(a + b);
    }, 100);
  });
}

describe('monk  tracer tests', () => {
  it('sync should work', (done) => {
    const wrapped = methodWrapper.wrap(testMethod);
    const spied = chai.spy(wrapped);
    const result = spied(1, 2);
    expect(result)
      .to
      .equal(3);
    expect(spied)
      .to
      .have
      .been
      .called();
    done();
  });

  it('async should work', (done) => {
    co(function* callback() {
      const wrapped = methodWrapper.wrap(testAsyncMethod);
      const spied = chai.spy(wrapped);
      const result = yield spied(1, 2);
      expect(result)
        .to
        .equal(3);
      expect(spied)
        .to
        .have
        .been
        .called();
      done();
    })
      .then(() => {
      }, (err) => {
        done(err);
      });
  });

  it('should trace the sync method', (done) => {
    const wrapped = methodWrapper.wrap(testMethod);
    const spied = chai.spy(wrapped);
    const clsCtx = cls.createContext();
    cls.enter(clsCtx);
    cls.set('traceInfo', {
      app: 'test-app',
      traceId: uuid.v4(),
    });
    const result = spied(1, 2);
    expect(result)
      .to
      .equal(3);
    expect(logger.info)
      .to
      .have
      .been
      .called();
    cls.exit(clsCtx);
    done();
  });

  it('should trace the async method', (done) => {
    const clsCtx = cls.createContext();
    cls.enter(clsCtx);
    cls.set('traceInfo', {
      app: 'test-app',
      traceId: uuid.v4(),
    });
    co(function* callback() {
      const wrapped = methodWrapper.wrap(testAsyncMethod);
      const spied = chai.spy(wrapped);
      const result = yield spied(1, 2);
      expect(result)
        .to
        .equal(3);
      expect(logger.info)
        .to
        .have
        .been
        .called();
      done();
    })
      .then(() => {
        cls.exit(clsCtx);
      }, (err) => {
        cls.exit(clsCtx);
        done(err);
      });
  });

  it('should trace exception for sync method', (done) => {
    function testExceptionMethod() {
      throw new Error('test');
    }

    const clsCtx = cls.createContext();
    cls.enter(clsCtx);
    cls.set('traceInfo', {
      app: 'test-app',
      traceId: uuid.v4(),
    });
    const spied = chai.spy(methodWrapper.wrap(testExceptionMethod));
    try {
      spied(1, 2);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log(err);
    }

    expect(logger.error)
      .to
      .have
      .been
      .called();
    cls.exit(clsCtx);
    done();
  });

  it('should trace the async method', (done) => {
    const clsCtx = cls.createContext();
    cls.enter(clsCtx);
    cls.set('traceInfo', {
      app: 'test-app',
      traceId: uuid.v4(),
    });

    function* testAsyncErrorMethod() {
      return yield new Promise((resolve, reject) => {
        setTimeout(() => {
          reject(new Error('test exception'));
        }, 100);
      });
    }

    co(function* callback() {
      const wrapped = methodWrapper.wrap(testAsyncErrorMethod);
      const spied = chai.spy(wrapped);
      try {
        yield spied(1, 2);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.log(err);
      }
      expect(logger.error)
        .to
        .have
        .been
        .called();
      done();
    })
      .then(() => {
        cls.exit(clsCtx);
      }, (err) => {
        cls.exit(clsCtx);
        done(err);
      });
  });
});
