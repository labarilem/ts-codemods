import { describe } from 'mocha';
import { expect } from 'chai';
import { promisify } from 'util';

const sleep = promisify(setTimeout);

describe('a test suite', function () {
  it('a test', function (done) {
    sleep(1).then(() => done());
    sleep(2).then(() => {
      expect(true).to.be.true;
      done()
    });
  });
});
