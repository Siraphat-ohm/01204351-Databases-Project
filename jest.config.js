const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    // Handle module aliases (this will be automatically configured for you soon)
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/src/lib/openapi/'],
  transformIgnorePatterns: [
    'node_modules/(?!(bson|mongodb|mongoose)/)',
  ],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = async () => {
  const jestConfig = await createJestConfig(customJestConfig)()
  return {
    ...jestConfig,
    transformIgnorePatterns: [
      '/node_modules/(?!(.pnpm|bson|mongodb|mongoose)/)(?!.*node_modules/(bson|mongodb)/)',
    ],
  }
}
