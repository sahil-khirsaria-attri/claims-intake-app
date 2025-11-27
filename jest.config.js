const nextJest = require("next/jest")

const createJestConfig = nextJest({
  dir: "./",
})

const customJestConfig = {
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testEnvironment: "jest-environment-jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/.next/"],
  collectCoverageFrom: [
    "app/**/*.{js,jsx,ts,tsx}",
    "components/layout/**/*.{js,jsx,ts,tsx}",
    "components/claims/**/*.{js,jsx,ts,tsx}",
    "components/ui/button.tsx",
    "components/ui/card.tsx",
    "components/ui/status-badge.tsx",
    "components/ui/metric-card.tsx",
    "lib/utils.ts",
    "lib/mock-data.ts",
    "lib/api/client.ts",
    "lib/rules/engine.ts",
    "!**/*.d.ts",
    "!**/node_modules/**",
    "!**/.next/**",
    "!**/coverage/**",
  ],
  // Coverage thresholds for specific files that are tested
  coverageThreshold: {
    "lib/utils.ts": {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    "lib/mock-data.ts": {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    "components/ui/button.tsx": {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    "components/ui/status-badge.tsx": {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    "components/layout/app-shell.tsx": {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    "components/layout/header.tsx": {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
  coverageReporters: ["text", "lcov", "html"],
  testMatch: [
    "**/__tests__/**/*.[jt]s?(x)",
    "**/?(*.)+(spec|test).[jt]s?(x)",
  ],
  moduleDirectories: ["node_modules", "<rootDir>"],
}

module.exports = createJestConfig(customJestConfig)
