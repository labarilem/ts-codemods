import { describe } from 'mocha';
import { expect } from 'chai';

describe('a test suite', function () {
  it.skip('a test', async function() {
    setTimeout(() => {
      expect(true).to.be.true;
    }, 1);
  });
});
