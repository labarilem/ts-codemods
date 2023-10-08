import { describe } from 'mocha';
import { expect } from 'chai';
import { agent } from 'supertest';

describe('my api resource', function () {
  it('replies with code 200', async function() {
    agent()
      .get('https://myapi.com/resource')
      .end(function (err, res) {
      if (err) return;
      expect(res.statusCode).to.equal(200);
    });
  });
});
