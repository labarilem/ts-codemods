import { defineTest } from 'jscodeshift/src/testUtils';

describe('async-it transformer', () => {
  defineTest(__dirname, './src/async-supertest', null, 'async-supertest/supertest', { parser: 'ts' });
});


