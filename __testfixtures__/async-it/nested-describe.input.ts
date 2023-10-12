import { describe } from 'mocha';
import { expect } from 'chai';

describe('a test suite', function () {
  describe('a nested suite', function () {
    it('a test', function (done) {
      expect(true).to.be.true;
      done();
    });
  });
});
