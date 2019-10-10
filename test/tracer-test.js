/* eslint-env node, mocha */
const request = require('supertest');
const Koa = require('koa');
const { expect } = require('chai');

const koaMetrics = require('../lib')({
  app: 'my-sample-app',
});

const { route } = koaMetrics;

describe('superagent tracer tests', () => {
  it('should pass the tracerId when receive a request', (done) => {
    const app = Koa();
    app.use(koaMetrics.tracer);
    // eslint-disable-next-line require-yield
    app.use(route.get('/tracer-id', function* handle() {
      this.body = this.tracerInfo.tracerId;
      return this.body;
    }));

    request(app.listen())
      .get('/tracer-id')
      .expect(200)
      .end((err, res) => {
        if (err) {
          done(err);
        } else {
          expect(res.text)
            .to
            .have
            .lengthOf(36);
          done();
        }
      });
  });

  it('should pass through the traceId when request another service', (done) => {
    let expectedTracerId = '';
    const app = Koa();

    app.use(koaMetrics.tracer);
    app.use(route.get('/request', function* handler() {
      expect(this.superagent)
        .to
        .be
        .an
        .instanceOf(Object);
      expect(this.superagent)
        .to
        .have
        .property('get');
      expectedTracerId = this.tracerInfo.tracerId;
      const res = yield this.superagent.get('http://127.0.0.1:8888/request2');
      this.body = res.text;
      return this.body;
    }));

    const app2 = Koa();
    app2.use(koaMetrics.tracer);
    // eslint-disable-next-line require-yield
    app2.use(route.get('/request2', function* handler() {
      this.body = this.tracerInfo.tracerId;
      return this.body;
    }));
    app2.listen(8888);

    request(app.listen())
      .get('/request')
      .expect(200)
      .end((err, res) => {
        if (err) {
          done(err);
        } else {
          expect(res.text)
            .to
            .have
            .lengthOf(36);
          expect(res.text)
            .to
            .equal(expectedTracerId);
          done();
        }
      });
  });
});
