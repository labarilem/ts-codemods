# ts-codemods

Codemods for Typescript built with [jscodeshift](https://github.com/facebook/jscodeshift).

Be careful when using codemods and always check the transformed code.
Also remember that not every code migration can be easily 100% automated.

## Development

To learn more about building codemods, check out [these](https://marcolabarile.me/my%20projects/2023/10/13/automating-callbacks-to-async-migration-in-mocha-tests-1/) [articles](https://marcolabarile.me/my%20projects/2023/10/19/automating-callbacks-to-async-migration-in-mocha-tests-2/) on my blog.

Install dependencies:

```
$ npm i
```

Run tests:

```
$ npm test
```

## How to run codemods

Install jscodeshift:

```
$ npm i -g jscodeshift
```

Run a codemod for Typescript files:

```
$ jscodeshift --parser=ts -t <path-to-codemod> <file-path-or-pattern>
```

## Included codemods

### async-it

Transforms callback-based Mocha tests to async/await-based tests.
It has options to remove or replace the `done` function used to return control after async operations.

Example:

_command_
```bash
jscodeshift -t ./src/async-it.ts <file> --parser=ts --rmDoneFunc=true
```

_input code_
```typescript
import { describe } from 'mocha';
import { expect } from 'chai';

describe('a test suite', function () {
  it('a test', function (done) {
    setTimeout(() => {
      expect(true).to.be.true;
      done();
    }, 1);
  });
});
```

_output code_
```typescript
import { describe } from 'mocha';
import { expect } from 'chai';

describe('a test suite', function () {
  it('a test', async function() {
    setTimeout(() => {
      expect(true).to.be.true;
    }, 1);
  });
});
```

Options:
- **describeFuncName** *(string)*
  The name of the Mocha describe function. Set by default to `'describe'`, can be changed to adapt the code to a different testing framework.
- **itFuncName** *(string)* The name of the Mocha it function. Set by default to `'it'`, can be changed to adapt the code to a different testing framework.
- **itFuncName** *(string)* The name of the Mocha skip function. Set by default to `'skip'`, can be changed to adapt the code to a different testing framework.
- **doneFuncName** *(string)* The name of the Mocha done function. Set by default to `'done'`, can be changed to adapt the code to a different testing framework.
- **rmDoneFunc** *(boolean)* Whether to remove the done function. Set by default to false.
- **rmDoneFuncMode** *('rm' OR 'throw')* Done function removal mode: use `'rm'` to remove function calls or `'throw'` to replace them with an error throw. This allows you to choose how to carry out the manual review after running the codemod. A manual review is expected since the codemod cannot convert all the code automatically. Set by default to `'rm'`.

### async-supertest

Transforms callback-based Mocha tests to async/await-based tests. Also transforms supertest HTTP calls code from callback-based to async. This codemod uses the _async-it_ codemod.

Example:

_command_
```bash
jscodeshift -t ./src/async-supertest.ts <file> --parser=ts
```

_input code_
```typescript
import { describe } from 'mocha';
import { expect } from 'chai';
import { agent } from 'supertest';

describe('my api resource', function () {
  it('replies with code 200', function (done) {
    agent()
      .get('https://myapi.com/resource')
      .end(function (err, res) {
        if (err) return done(err);
        expect(res.statusCode).to.equal(200);
        expect(res.body.email).to.equal('hello@myapi.com');
        done();
      });
  });
});
```

_output code_
```typescript
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
```
