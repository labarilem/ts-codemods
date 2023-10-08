import { describe } from 'mocha';
import { expect } from 'chai';

describe('a test suite', function () {
  it('a test', async function() {
    setTimeout(() => {
      expect(true).to.be.true;
      throw new Error('Please migrate this callback');;
    }, 1);
  });
});
