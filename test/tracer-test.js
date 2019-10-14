/* eslint-env node, mocha */
const request = require('supertest');
const Koa = require('koa');
const { expect } = require('chai');
const uuid = require('uuid');
const consts = require('../lib/global/constants');

const koaMetrics = require('../lib')({
  app: 'my-sample-app',
});

const { route } = koaMetrics;

describe('superagent tracer tests', () => {
  it('should pass the traceId when receive a request', (done) => {
    const app = Koa();
    app.use(koaMetrics.tracer);
    // eslint-disable-next-line require-yield
    app.use(route.get('/trace-id', function* handle() {
      this.body = this.traceInfo.traceId;
      return this.body;
    }));

    request(app.listen())
      .get('/trace-id')
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

  it('should return the traceId when receive a request', (done) => {
    const app = Koa();
    app.use(koaMetrics.tracer);
    // eslint-disable-next-line require-yield
    app.use(route.get('/trace-id', function* handle() {
      this.body = this.traceInfo.traceId;
      return this.body;
    }));

    request(app.listen())
      .get('/trace-id')
      .expect(200)
      .end((err, res) => {
        if (err) {
          done(err);
        } else {
          expect(res.headers[consts.HTTP_HEADER_TRACE_ID])
            .to
            .have
            .lengthOf(36);
          done();
        }
      });
  });

  it('should pass through the traceId when request another service', (done) => {
    let expectedTraceId = '';
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
      expectedTraceId = this.traceInfo.traceId;
      const res = yield this.superagent.get('http://127.0.0.1:8888/request2');
      this.body = res.text;
      return this.body;
    }));

    const app2 = Koa();
    app2.use(koaMetrics.tracer);
    // eslint-disable-next-line require-yield
    app2.use(route.get('/request2', function* handler() {
      this.body = this.traceInfo.traceId;
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
            .equal(expectedTraceId);
          done();
        }
      });
  });

  it('should return correct traceId for concurrent reqeust', () => {
    const requestId1 = uuid.v4();
    const requestId2 = uuid.v4();

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
      const res = yield this.superagent.get('http://127.0.0.1:9999/request2');
      this.body = res.text;
      return this.body;
    }));

    const app2 = Koa();
    app2.use(koaMetrics.tracer);
    // eslint-disable-next-line require-yield
    app2.use(route.get('/request2', function* handler() {
      this.body = this.traceInfo.traceId;
      return this.body;
    }));
    app2.listen(9999);

    const testServer = request(app.listen());
    return Promise.all([
      testServer.get('/request')
        .set(consts.HTTP_HEADER_TRACE_ID, requestId1)
        .expect(200)
        .then(res => res.text),
      testServer.get('/request')
        .set(consts.HTTP_HEADER_TRACE_ID, requestId2)
        .expect(200)
        .then(res => res.text),
    ])
      .then(([id1, id2]) => {
        expect(id1)
          .to
          .equal(requestId1);
        expect(id2)
          .to
          .equal(requestId2);
      });
  });
});
