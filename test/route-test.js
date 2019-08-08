/* eslint-env node, mocha */
const request = require('supertest');
const Koa = require('koa');
const methods = require('methods').map((method) => {
  // normalize method names for tests
  if (method === 'delete') return 'del';
  if (method === 'connect') return ''; // WTF
  if (method === 'merge') return '';
  return method;
}).filter(Boolean);

const route = require('../route')();

methods.forEach((method) => {
  const app = new Koa();

  // eslint-disable-next-line require-yield
  app.use(route[method]('/:user(tj)', function* handle(user) {
    this.body = user;
  }));

  describe(`route.${method}()`, () => {
    describe('when method and path match', () => {
      it('should 200', (done) => {
        request(app.listen())
          // eslint-disable-next-line no-unexpected-multiline
          [method]('/tj')
          .expect(200)
          .expect(method === 'head' ? undefined : 'tj', done);
      });
    });

    describe('when only method matches', () => {
      it('should 404', (done) => {
        request(app.listen())
          // eslint-disable-next-line no-unexpected-multiline
          [method]('/tjayyyy')
          .expect(404, done);
      });
    });

    describe('when only path matches', () => {
      it('should 404', (done) => {
        request(app.listen())
          // eslint-disable-next-line no-unexpected-multiline
          [method === 'get' ? 'post' : 'get']('/tj')
          .expect(404, done);
      });
    });
  });
});

describe('route.all()', () => {
  describe('should work with', () => {
    methods.forEach((method) => {
      const app = new Koa();
      // eslint-disable-next-line require-yield
      app.use(route.all('/:user(tj)', function* handle(user) {
        this.body = user;
      }));

      it(method, (done) => {
        request(app.listen())
          // eslint-disable-next-line no-unexpected-multiline
          [method]('/tj')
          .expect(200)
          .expect(method === 'head' ? undefined : 'tj', done);
      });
    });
  });

  describe('when patch does not match', () => {
    it('should 404', (done) => {
      const app = new Koa();
      // eslint-disable-next-line require-yield
      app.use(route.all('/:user(tj)', function* handle(user) {
        this.body = user;
      }));

      request(app.listen())
        .get('/tjayyyyyy')
        .expect(404, done);
    });
  });
});
