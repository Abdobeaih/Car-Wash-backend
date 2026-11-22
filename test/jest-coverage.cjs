module.exports = {
  ...require('./jest-e2e.json'),
  rootDir: '..',
  testRegex: '.*\\.(spec|e2e-spec)\\.ts$',
  collectCoverageFrom: ['src/**/*.ts'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'json-summary', 'lcov'],
  coverageThreshold: { global: { statements: 75, branches: 65, functions: 75, lines: 75 } },
};
