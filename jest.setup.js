// Jest setup file to suppress console outputs during tests
const originalConsole = global.console;

// Mock console methods to suppress output during tests
global.console = {
  ...originalConsole,
  // Keep these for actual test failures
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

// Restore console for debugging when needed
global.restoreConsole = () => {
  global.console = originalConsole;
};