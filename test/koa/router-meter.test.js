/* eslint-env node, mocha */

const request = require('supertest');
const Koa = require('koa-v2');
const Router = require('@koa/router');
const chai = require('chai');
const spies = require('chai-spies');

const states = require('../../lib/monitor/http_stats');
const routerMeter = require('../../lib/koa/router-meter');

chai.use(spies);
const { expect } = chai;

describe('koa2 router meter tests', () => {
  it('should work', (done) => {
    const app = new Koa();
    const router = new Router();
    const statsInstance = states.createStats({});
    statsInstance.respTimeHistogram = chai.spy(statsInstance.respTimeHistogram);
    app.use(routerMeter.create(statsInstance));
    router.get('/trace-id', (ctx) => {
      ctx.body = 'foo';
    });
    app.use(router.routes());
    const server = app.listen();

    request(server)
      .get('/trace-id')
      .expect(200)
      .end((err, res) => {
        server.close();
        if (res) {
          expect(res.text).to.equal('foo');
        }
        expect(statsInstance.respTimeHistogram).to.have.been.called();
        done(err);
      });
  });
});
