import { describe } from 'mocha';
import { expect } from 'chai';
import { agent } from 'supertest';

describe('my api resource', function () {
  it('replies with code 200', async function() {
    const res = await agent()
      .get('https://myapi.com/resource');;
    expect(res.statusCode).to.equal(200);
    expect(res.body.email).to.equal('hello@myapi.com');
  });
});
