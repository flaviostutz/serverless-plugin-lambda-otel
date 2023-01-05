module.exports = {
  testMatch: ['**/?(*.)+(spec|test).+(ts|tsx|js)'],
  collectCoverage: true,
  collectCoverageFrom: ['./index.js'],
  coverageThreshold: {
    global: {
      lines: 90,
      branches: 85,
      functions: 90,
    },
  },
};
