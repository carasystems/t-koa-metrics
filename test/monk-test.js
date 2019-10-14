/* eslint-env node, mocha */
const monk = require('monk');
const request = require('supertest');
const Koa = require('koa');
const chai = require('chai');
const spies = require('chai-spies');

chai.use(spies);
const { expect } = chai;

const koaMetrics = require('../lib')({
  app: 'my-sample-app',
});

const { route, monkTracer } = koaMetrics;

const brokerDb = monk('mongodb://localhost:27017/user');
const spyedMonkTracer = chai.spy(monkTracer);
brokerDb.addMiddleware(spyedMonkTracer);
const brokerCol = brokerDb.get('broker2222');

describe('monk  tracer tests', () => {
  it('should works', (done) => {
    const app = Koa();
    app.use(koaMetrics.tracer);
    // eslint-disable-next-line require-yield
    app.use(route.get('/tracer-id', function* handle() {
      yield brokerCol.find({});
      this.body = {};
      return this.body;
    }));

    request(app.listen())
      .get('/tracer-id')
      .expect(200)
      .end((err) => {
        if (err) {
          done(err);
        } else {
          expect(spyedMonkTracer)
            .to
            .have
            .been
            .called();
          done();
        }
      });
  });
});
