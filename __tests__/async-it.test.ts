import { defineTest } from 'jscodeshift/src/testUtils';

describe('async-it transformer', () => {
  // callback
  defineTest(__dirname, './src/async-it', { rmDoneFunc: false }, 'async-it/callback-norm', { parser: 'ts' });
  defineTest(__dirname, './src/async-it', { rmDoneFunc: true, rmDoneFuncMode: 'rm' }, 'async-it/callback-rm', { parser: 'ts' });
  defineTest(__dirname, './src/async-it', { rmDoneFunc: true, rmDoneFuncMode: 'rm' }, 'async-it/callback-rm-supertest', { parser: 'ts' });
  defineTest(__dirname, './src/async-it', { rmDoneFunc: true, rmDoneFuncMode: 'throw' }, 'async-it/callback-throw', { parser: 'ts' });
  // promises
  defineTest(__dirname, './src/async-it', { rmDoneFunc: false }, 'async-it/promises-norm', { parser: 'ts' });
  defineTest(__dirname, './src/async-it', { rmDoneFunc: true, rmDoneFuncMode: 'rm' }, 'async-it/promises-rm', { parser: 'ts' });
  defineTest(__dirname, './src/async-it', { rmDoneFunc: true, rmDoneFuncMode: 'throw' }, 'async-it/promises-throw', { parser: 'ts' });
});


