/* eslint-env node, mocha */
const chai = require('chai');
const objUtils = require('../../lib/util/objects');

const { expect } = chai;

describe('util.objects tests', () => {
  describe('deepExtend tests', () => {
    it('extend with null and undefined', () => {
      const obj1 = {
        foo: 'bar',
      };
      objUtils.deepExtend(obj1, undefined);
      expect(obj1).deep.equal({ foo: 'bar' });

      const obj2 = {
        foo: 'bar',
      };
      objUtils.deepExtend(obj2, null);
      expect(obj2).deep.equal({ foo: 'bar' });
    });

    it('extend works', () => {
      const obj1 = {
        a: 'a',
        b: 'b',
      };
      const obj2 = {
        a: 'aa',
        c: 'abc',
        d: 'd',
      };

      objUtils.deepExtend(obj1, obj2);
      expect(obj1).deep.equal({
        a: 'aa',
        b: 'b',
        c: 'abc',
        d: 'd',
      });
    });

    it('extend with nested', () => {
      const obj1 = {
        a: {
          aa: 'aa',
          bb: 'bb',
        },
        b: 'b',
        c: {
          cc: 'cc',
          dd: 'dd',
        },
      };
      const obj2 = {
        a: {
          aa: 'aa2',
        },
        b: 'bb',
        c: {
          ccc: 'ccc',
        },
      };
      objUtils.deepExtend(obj1, obj2);
      expect(obj1).deep.equal({
        a: {
          aa: 'aa2',
          bb: 'bb',
        },
        b: 'bb',
        c: {
          cc: 'cc',
          dd: 'dd',
          ccc: 'ccc',
        },
      });
    });

    it('extend with array', () => {
      const obj1 = {
        a: [1, 2, 3],
        b: {
          bb: [1, 2, 3],
          cc: 'cc',
        },
        c: {
          cc: {
            ccc: [1, 2, 3],
            ccc2: [1, 2, 3],
          },
        },
      };
      const obj2 = {
        a: [4, 5, 6],
        b: {
          bb: [3, 4, 5],
          bbb: 'bbb',
          d: [1, 2, 3],
        },
        c: {
          cc: {
            ccc: [5, 6, 7],
            ccc3: 'ccc3',
          },
        },
      };
      objUtils.deepExtend(obj1, obj2);
      expect(obj1).deep.equal({
        a: [4, 5, 6],
        b: {
          bb: [3, 4, 5],
          bbb: 'bbb',
          cc: 'cc',
          d: [1, 2, 3],
        },
        c: {
          cc: {
            ccc: [5, 6, 7],
            ccc2: [1, 2, 3],
            ccc3: 'ccc3',
          },
        },
      });
    });
  });

  describe('makeImmutable tests', () => {
    it('should work', () => {
      const dateNow = new Date();
      const obj = {
        k1: 'k1',
        k2: {
          kk1: {
            kkk1: 'abc',
            kkk2: 1,
          },
          kk2: 'kk2',
        },
        k3: 1,
        k4: dateNow,
      };
      objUtils.makeImmutable(obj);
      obj.k1 = 'k2';
      obj.k2.kk1.kkk1 = 'abc-kkk1';
      expect(obj.k1).to.equal('k1');
      expect(obj.k2.kk1.kkk1).to.equal('abc');
    });
  });
});
