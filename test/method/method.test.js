/* eslint-env node, mocha */
const uuid = require('uuid');
const co = require('co');
const chai = require('chai');
const sinon = require('sinon');
const cls = require('../../lib/cls');

const { expect } = chai;

const methodWrapper = require('../../lib/method/wrapper');

function testMethod(a, b) {
  return a + b;
}

function* testGeneratorMethod(a, b) {
  return yield new Promise((resolve) => {
    setTimeout(() => {
      resolve(a + b);
    }, 100);
  });
}

async function testAsyncMethod(a, b) {
  const result = await new Promise((resolve) => {
    setTimeout(() => resolve(a + b), 50);
  });
  return result;
}

const traceInfoLogger = sinon.fake();
const traceErrorLogger = sinon.fake();

function createWrapperLogger() {
  return {
    info: traceInfoLogger,
    error: traceErrorLogger,
  };
}

describe('methods tracer tests', () => {
  beforeEach(() => {
    traceInfoLogger.resetHistory();
    traceErrorLogger.resetHistory();
  });

  it('wrap sync function should work', (done) => {
    const logger = createWrapperLogger();
    const wrapper = methodWrapper.create({
      logger,
    });

    const wrapped = wrapper.wrap(testMethod);
    const result = wrapped(1, 2);
    expect(result).to.equal(3);
    expect(traceInfoLogger.callCount).to.equal(0);
    done();
  });

  it('wrap generator should work', (done) => {
    co(function* callback() {
      const logger = createWrapperLogger();
      const wrapper = methodWrapper.create({
        logger,
      });
      const wrapped = wrapper.wrap(testGeneratorMethod);
      const result = yield wrapped(1, 2);
      expect(result).to.equal(3);
      expect(traceInfoLogger.callCount).to.equal(0);
      done();
    }).catch(done);
  });

  it('wrap async function should work', (done) => {
    const logger = createWrapperLogger();
    const wrapper = methodWrapper.create({
      logger,
    });

    const wrapped = wrapper.wrap(testAsyncMethod);
    wrapped(1, 2)
      .then((res) => {
        expect(res).to.equal(3);
        expect(traceInfoLogger.callCount).to.equal(0);
        done();
      })
      .catch(done);
  });

  it('should trace the sync method', (done) => {
    const logger = createWrapperLogger();
    const wrapper = methodWrapper.create({
      logger,
    });

    const wrapped = wrapper.wrap(testMethod);

    cls.bind(() => {
      cls.set('traceInfo', {
        traceId: uuid.v4(),
      });

      const result = wrapped(1, 2);
      expect(result).to.equal(3);
      expect(traceInfoLogger.callCount).to.equal(1);
      done();
    })();
  });

  it('should trace the generator method', (done) => {
    const clsCtx = cls.createContext();
    cls.enter(clsCtx);
    const logger = createWrapperLogger();
    const wrapper = methodWrapper.create({
      logger,
    });
    const wrapped = wrapper.wrap(testGeneratorMethod);
    co(function* callback() {
      cls.set('traceInfo', {
        traceId: uuid.v4(),
      });
      const result = yield wrapped(1, 2);
      expect(result).to.equal(3);
      expect(traceInfoLogger.callCount).to.equal(1);
      done();
    })
      .catch(done)
      .finally(() => {
        cls.exit(clsCtx);
      });
  });

  it('should trace the async method', (done) => {
    const clsCtx = cls.createContext();
    cls.enter(clsCtx);
    cls.set('traceInfo', {
      traceId: uuid.v4(),
    });
    const logger = createWrapperLogger();
    const wrapper = methodWrapper.create({
      logger,
    });
    const wrapped = wrapper.wrap(testAsyncMethod);
    wrapped(1, 2)
      .then((res) => {
        expect(res).to.equal(3);
        expect(traceInfoLogger.callCount).to.equal(1);
        done();
      })
      .catch(done)
      .finally(() => {
        cls.exit(clsCtx);
      });
  });

  it('should trace exception for sync method', (done) => {
    function testExceptionMethod() {
      throw new Error('test');
    }

    const logger = createWrapperLogger();
    const wrapper = methodWrapper.create({
      logger,
    });
    const wrapped = wrapper.wrap(testExceptionMethod);

    cls.bind(() => {
      cls.set('traceInfo', {
        app: 'test-app',
        traceId: uuid.v4(),
      });
      try {
        wrapped(1, 2);
        done(new Error('unexpected'));
      } catch (err) {
        // do nothing for error;
        expect(traceErrorLogger.callCount).to.equal(1);
        done();
      }
    })();
  });

  it('should trace exception for generator method', (done) => {
    const clsCtx = cls.createContext();
    cls.enter(clsCtx);
    cls.set('traceInfo', {
      app: 'test-app',
      traceId: uuid.v4(),
    });

    const logger = createWrapperLogger();

    function* testAsyncErrorMethod() {
      return yield new Promise((resolve, reject) => {
        setTimeout(() => {
          reject(new Error('test exception'));
        }, 100);
      });
    }

    co(function* callback() {
      const wrapper = methodWrapper.create({
        logger,
      });
      const wrapped = wrapper.wrap(testAsyncErrorMethod);
      try {
        yield wrapped(1, 2);
        done(new Error('Unexpected'));
      } catch (err) {
        // do nothing
      }
      expect(traceErrorLogger.callCount).to.equal(1);
      done();
    }).catch(done);
  });

  it('should trace exception for async method', async () => {
    const clsCtx = cls.createContext();
    cls.enter(clsCtx);
    cls.set('traceInfo', {
      app: 'test-app',
      traceId: uuid.v4(),
    });

    const logger = createWrapperLogger();

    async function testAsyncErrorMethod() {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          reject(new Error('test exception'));
        }, 100);
      });
    }

    const wrapper = methodWrapper.create({
      logger,
    });
    const wrapped = wrapper.wrap(testAsyncErrorMethod);

    try {
      await wrapped();
    } catch (err) {
      expect(traceErrorLogger.callCount).to.equal(1);
    } finally {
      cls.exit(clsCtx);
    }
  });
});
