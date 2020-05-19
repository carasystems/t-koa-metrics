/* eslint-env node, mocha */
const uuid = require('uuid');
const co = require('co');
const chai = require('chai');
const spies = require('chai-spies');
const cls = require('../../lib/global/cls');

chai.use(spies);
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

function createWrapperLogger() {
  return {
    // eslint-disable-next-line no-console
    info: chai.spy(console.log),
    // eslint-disable-next-line no-console
    error: chai.spy(console.error),
  };
}

describe('monk tracer tests', () => {
  it('wrap sync function should work', (done) => {
    const logger = createWrapperLogger();
    const wrapper = methodWrapper.create({
      logger,
    });

    const wrapped = wrapper.wrap(testMethod);
    const spied = chai.spy(wrapped);
    const result = spied(1, 2);

    expect(result).to.equal(3);
    expect(spied).to.have.been.called.exactly(1);
    done();
  });

  it('wrap generator should work', (done) => {
    co(function* callback() {
      const logger = createWrapperLogger();
      const wrapper = methodWrapper.create({
        logger,
      });
      const wrapped = wrapper.wrap(testGeneratorMethod);
      const spied = chai.spy(wrapped);
      const result = yield spied(1, 2);
      expect(result).to.equal(3);
      expect(spied).to.have.been.called.exactly(1);
    }).then(
      () => done(),
      (err) => {
        done(err);
      }
    );
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
        done();
      })
      .catch(done);
  });

  it('should trace the sync method', (done) => {
    const clsCtx = cls.createContext();
    cls.enter(clsCtx);
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
      expect(logger.info).to.have.been.called.exactly(1);
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
      expect(logger.info).to.have.been.called.exactly(1);
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
        expect(logger.info).to.have.been.called.exactly(1);
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
    const clsCtx = cls.createContext();
    cls.enter(clsCtx);
    cls.set('traceInfo', {
      app: 'test-app',
      traceId: uuid.v4(),
    });
    const wrapper = methodWrapper.create({
      logger,
    });
    const spied = chai.spy(wrapper.wrap(testExceptionMethod));
    try {
      spied(1, 2);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log(err);
    }

    expect(logger.error).to.have.been.called.exactly(1);
    cls.exit(clsCtx);
    done();
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
      const spied = chai.spy(wrapped);
      try {
        yield spied(1, 2);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.log(err);
      }
      expect(logger.error).to.have.been.called.exactly(1);
      done();
    })
      .then(
        () => {},
        (err) => {
          done(err);
        }
      )
      .finally(() => {
        cls.exit(clsCtx);
      });
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
      expect(logger.error).to.have.been.called.exactly(1);
    }
  });
});
