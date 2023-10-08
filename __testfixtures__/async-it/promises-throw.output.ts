import { describe } from 'mocha';
import { expect } from 'chai';
import { promisify } from 'util';

const sleep = promisify(setTimeout);

describe('a test suite', function () {
  it('a test', async function() {
    sleep(1).then(() => {
      throw new Error('Please migrate this callback');
    });
    sleep(2).then(() => {
      expect(true).to.be.true;
      throw new Error('Please migrate this callback');;
    });
  });
});
