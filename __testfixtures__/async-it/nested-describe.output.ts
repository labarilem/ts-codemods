import { describe } from 'mocha';
import { expect } from 'chai';

describe('a test suite', function () {
  describe('a nested suite', function () {
    it('a test', async function() {
      expect(true).to.be.true;
    });
  });
});
