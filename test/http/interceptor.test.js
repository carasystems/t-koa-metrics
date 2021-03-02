/* eslint-env node, mocha */

const { expect } = require('chai');
const sinon = require('sinon');
const nock = require('nock');
const AWS = require('aws-sdk');
const request = require('supertest');
const thunkify = require('thunkify');
const KoaV1 = require('koa-v1');
const route = require('koa-route');
const KoaV2 = require('koa-v2');
const Router = require('@koa/router');
const uuid = require('uuid');
const fetch = require('node-fetch');
const axios = require('axios');

const koa2Trace = require('../../lib/koa2/tracer');
const { inject } = require('../../lib/http/interceptor');
const constants = require('../../lib/constants');

const trace = require('../../lib/koa/tracer')();

const infoLogger = sinon.fake();
const errorLogger = sinon.fake();

const spiedLogger = {
  info: infoLogger,
  error: errorLogger,
};

inject({
  traceLogger: spiedLogger,
});

describe('http interceptor tests', () => {
  beforeEach(() => {
    infoLogger.resetHistory();
    errorLogger.resetHistory();
  });

  describe('capture aws requests', () => {
    it('works in koa-v2', async () => {
      const app = new KoaV2();
      app.use(koa2Trace());
      const router = new Router();
      const s3Client = new AWS.S3({
        region: 'us-west-2',
      });
      const s3Nock = nock('https://foo.s3.us-west-2.amazonaws.com').get('/bar').reply(200, {});
      async function s3Action() {
        return s3Client
          .getObject({
            Bucket: 'foo',
            Key: 'bar',
          })
          .promise();
      }

      const traceId = uuid.v4();
      router.get('/request', async (ctx) => {
        const res = await s3Action();
        ctx.body = res;
      });
      app.use(router.routes());
      const server = app.listen();
      await request(server).get('/request').set(constants.HTTP_HEADER_TRACE_ID, traceId).expect(200);
      server.close();
      expect(s3Nock.isDone()).to.equal(true);
      expect(infoLogger.callCount).to.equal(1);
      const traceLogCall = infoLogger.getCall(0);
      expect(traceLogCall.firstArg.trace_id).to.equal(traceId);
      expect(traceLogCall.firstArg.span.type).to.equal('AWS');
    });

    it('works in koa-v1', (done) => {
      const app = KoaV1();
      const traceId = uuid.v4();
      app.use(trace);

      const s3Nock = nock('https://foo.s3.us-west-2.amazonaws.com').get('/bar').reply(200, {});
      const s3Client = new AWS.S3({
        region: 'us-west-2',
      });

      const s3Action = thunkify((callback) => {
        return s3Client.getObject(
          {
            Bucket: 'foo',
            Key: 'bar',
          },
          (err, resp) => {
            if (err) {
              return callback(err);
            }

            return callback(null, resp);
          }
        );
      });

      app.use(
        // eslint-disable-next-line require-yield
        route.get('/request', function* handle() {
          yield s3Action();
          this.body = this.traceInfo.traceId;
          return this.body;
        })
      );

      const server = app.listen();
      request(server)
        .get('/request')
        .set(constants.HTTP_HEADER_TRACE_ID, traceId)
        .expect(200)
        .end((err, res) => {
          server.close();
          if (err) {
            done(err);
          } else {
            expect(s3Nock.isDone()).to.equal(true);
            expect(infoLogger.callCount).to.equal(1);
            const traceLogCall = infoLogger.getCall(0);
            expect(traceLogCall.firstArg.trace_id).to.equal(traceId);
            expect(traceLogCall.firstArg.span.type).to.equal('AWS');
            expect(res.text).to.equal(traceId);
            done();
          }
        });
    });
  });

  describe('capture http request', () => {
    function createServer1(asyncFn) {
      const app = new KoaV2();
      const router = new Router();

      router.get('/request', async (ctx) => {
        const res = await asyncFn();
        ctx.body = res;
      });
      app.use(koa2Trace());
      app.use(router.routes());
      return app.listen();
    }

    function createServer2() {
      const app = new KoaV2();
      app.use(koa2Trace());
      const router = new Router();
      router.get('/request2', (ctx) => {
        ctx.body = {
          trace: ctx.state.traceInfo.traceId,
        };
      });

      app.use(router.routes());
      return app.listen(9999);
    }

    it('works in node-fetch', async () => {
      const server1 = createServer1(async () => {
        const res = await fetch('http://localhost:9999/request2');
        return res.json();
      });

      const server2 = createServer2();

      const traceId = uuid.v4();
      const res = await request(server1).get('/request').set(constants.HTTP_HEADER_TRACE_ID, traceId).expect(200);
      expect(res.body.trace).to.equal(traceId);
      expect(infoLogger.callCount).to.equal(1);
      const traceLogCall = infoLogger.getCall(0);
      expect(traceLogCall.firstArg.trace_id).to.equal(traceId);
      expect(traceLogCall.firstArg.span.type).to.equal('http');
      server1.close();
      server2.close();
    });

    it('works in axios', async () => {
      const server1 = createServer1(async () => {
        const res = await axios('http://localhost:9999/request2');
        return res.data;
      });

      const server2 = createServer2();
      const traceId = uuid.v4();
      const res = await request(server1).get('/request').set(constants.HTTP_HEADER_TRACE_ID, traceId).expect(200);
      expect(res.body.trace).to.equal(traceId);
      const traceLogCall = infoLogger.getCall(0);
      expect(traceLogCall.firstArg.trace_id).to.equal(traceId);
      expect(traceLogCall.firstArg.span.type).to.equal('http');
      server1.close();
      server2.close();
    });
  });
});
