import { defineTest } from 'jscodeshift/src/testUtils';

describe('async-supertest transformer', () => {
  // function
  defineTest(__dirname, './src/async-supertest', null, 'async-supertest/function', { parser: 'ts' });
  // arrow
  defineTest(__dirname, './src/async-supertest', null, 'async-supertest/arrow', { parser: 'ts' });
});


