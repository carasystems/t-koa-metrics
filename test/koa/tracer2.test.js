/* eslint-env node, mocha */

const request = require('supertest');
const Koa = require('koa-v2');
const Router = require('@koa/router');
const { expect } = require('chai');
const uuid = require('uuid');
const trace = require('../../lib/koa/tracer2');
const consts = require('../../lib/global/constants');

describe('test suite for tracer with koa2', () => {
  it('should pass the traceId when receive an request', (done) => {
    const app = new Koa();
    const router = new Router();
    app.use(trace({}));
    router.get('/trace-id', (ctx) => {
      ctx.body = ctx.state.traceInfo.traceId;
    });
    app.use(router.routes());
    const server = app.listen();

    request(server)
      .get('/trace-id')
      .expect(200)
      .end((err, res) => {
        if (res) {
          const traceId = res.text;
          const traceIdInHeader = res.headers[consts.HTTP_HEADER_TRACE_ID];
          expect(traceId).to.have.lengthOf(36);
          expect(traceIdInHeader).to.have.lengthOf(36);
          expect(traceId).to.equal(traceIdInHeader);
        }
        server.close();
        done(err);
      });
  });

  it('concurrent request', () => {
    const requestId1 = uuid.v4();
    const requestId2 = uuid.v4();

    const app = new Koa();
    const router = new Router();
    router.get('/request', async (ctx) => {
      expect(ctx.superagent).to.be.an.instanceOf(Object);
      expect(ctx.superagent).to.have.property('get');
      const res = await ctx.superagent.get('http://127.0.0.1:9999/request2');
      ctx.body = res.text;
    });
    app.use(trace());
    app.use(router.routes());
    const server = app.listen();

    const app2 = new Koa();
    app2.use(trace());
    const router2 = new Router();
    router2.get('/request2', (ctx) => {
      ctx.body = ctx.state.traceInfo.traceId;
    });

    app2.use(router2.routes());
    const server2 = app2.listen(9999);

    const testServer = request(server);
    return Promise.all([
      testServer
        .get('/request')
        .set(consts.HTTP_HEADER_TRACE_ID, requestId1)
        .expect(200)
        .then((res) => res.text),
      testServer
        .get('/request')
        .set(consts.HTTP_HEADER_TRACE_ID, requestId2)
        .expect(200)
        .then((res) => res.text),
    ])
      .then(([id1, id2]) => {
        expect(id1).to.equal(requestId1);
        expect(id2).to.equal(requestId2);
      })
      .finally(() => {
        server.close();
        server2.close();
      });
  });
});
