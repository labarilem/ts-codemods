import { describe } from 'mocha';
import { expect } from 'chai';
import { agent } from 'supertest';

describe('my api resource', function () {
  it('replies with code 200', function (done) {
    agent()
      .get('https://myapi.com/resource')
      .end((err, res) => {
        if (err) return done(err);
        expect(res.statusCode).to.equal(200);
        expect(res.body.email).to.equal('hello@myapi.com');
        done();
      });
  });
});
