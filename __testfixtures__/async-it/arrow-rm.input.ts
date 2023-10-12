import { describe } from 'mocha';
import { expect } from 'chai';

describe('a test suite', function () {
  it('a test', (done) => {
    setTimeout(() => {
      expect(true).to.be.true;
      done();
    }, 1);
  });
});
