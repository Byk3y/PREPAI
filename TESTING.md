# Testing Guide

This document provides comprehensive information about the testing infrastructure for the PrepAI React Native Expo Router app.

## Overview

The project uses **Jest** with manual configuration (compatible with Expo SDK 54) and **React Native Testing Library** for testing. The testing infrastructure is designed to work seamlessly with Expo Router, TypeScript, Zustand, and Supabase.

## Quick Start

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (recommended during development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

Tests are organized outside the `app/` directory (as required by Expo Router) in the `__tests__/` folder:

```
__tests__/
├── lib/
│   ├── errors/
│   │   ├── AppError.test.ts
│   │   ├── ErrorClassifier.test.ts
│   │   └── ErrorHandler.test.ts
│   ├── store/
│   │   └── slices/
│   │       ├── authSlice.test.ts
│   │       └── notebookSlice.test.ts
│   └── utils/
│       ├── utils.test.ts
│       └── time.test.ts
└── components/
    └── ErrorModal.test.tsx
```

## Test Naming Convention

- Test files should be named `*.test.ts` or `*.test.tsx`
- Place test files in `__tests__` directories or alongside source files (outside `app/`)
- Use descriptive test names that explain what is being tested

## Writing Tests

### Error Handling Tests

The error handling system is fully tested:

- **AppError**: Tests for error creation, retry logic, user messages, and data serialization
- **ErrorClassifier**: Tests for error classification from various error types (Error instances, strings, objects, Supabase errors)
- **ErrorHandler**: Tests for error handling, retry logic, and error boundary creation

Example:
```typescript
import { AppError } from '@/lib/errors/AppError';
import { ErrorType, ErrorSeverity } from '@/lib/errors/types';

describe('AppError', () => {
  it('should create an AppError with all properties', () => {
    const error = new AppError({
      type: ErrorType.NETWORK,
      message: 'Network request failed',
      context: { operation: 'test', timestamp: new Date().toISOString() },
      severity: ErrorSeverity.HIGH,
    });

    expect(error.type).toBe(ErrorType.NETWORK);
    expect(error.severity).toBe(ErrorSeverity.HIGH);
  });
});
```

### Zustand Store Tests

Store slices are tested by creating isolated store instances:

```typescript
import { create } from 'zustand';
import { createAuthSlice } from '@/lib/store/slices/authSlice';

describe('authSlice', () => {
  let useAuthStore: ReturnType<typeof create<AuthSlice>>;

  beforeEach(() => {
    useAuthStore = create<AuthSlice>()(createAuthSlice);
  });

  it('should set auth user', () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    useAuthStore.getState().setAuthUser(mockUser);
    expect(useAuthStore.getState().authUser).toEqual(mockUser);
  });
});
```

### Component Tests

Components are tested using React Native Testing Library:

```typescript
import { render, fireEvent } from '@testing-library/react-native';
import { MyComponent } from '@/components/MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    const { getByText } = render(<MyComponent title="Test" />);
    expect(getByText('Test')).toBeTruthy();
  });

  it('should handle user interactions', () => {
    const onPress = jest.fn();
    const { getByText } = render(<MyComponent onPress={onPress} />);
    
    fireEvent.press(getByText('Button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
```

### Utility Function Tests

Pure utility functions are straightforward to test:

```typescript
import { formatTime } from '@/lib/utils/time';

describe('formatTime', () => {
  it('should format seconds to MM:SS', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(125)).toBe('2:05');
  });
});
```

## Mocking

### Supabase Client

The Supabase client is automatically mocked in `jest.setup.js`. To customize mocks in specific tests:

```typescript
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: mockData, error: null })),
    })),
  },
}));
```

### Sentry

Sentry is automatically mocked to prevent sending errors during tests:

```typescript
import * as Sentry from '@/lib/sentry';

// Sentry functions are already mocked
// You can verify calls in tests:
expect(Sentry.captureAppError).toHaveBeenCalledWith(mockError);
```

### Expo Modules

Common Expo modules are mocked in `jest.setup.js`:
- `expo-router` - Router navigation
- `expo-secure-store` - Secure storage
- `expo-constants` - App constants
- `expo-device` - Device information
- `@react-native-async-storage/async-storage` - AsyncStorage

### React Native Modules

React Native modules are mocked where necessary:
- `react-native-safe-area-context` - SafeAreaView
- `expo-av` - Audio playback
- `expo-haptics` - Haptic feedback

## Configuration Files

### jest.config.js

Main Jest configuration with:
- `jest-expo` preset for Expo compatibility
- Path alias mapping (`@/*` → root directory)
- Test file patterns
- Coverage collection settings

### jest.setup.js

Global test setup file that:
- Configures mocks for all external dependencies
- Sets up test environment variables
- Suppresses console warnings/errors during tests (optional)

## Best Practices

### 1. Test Isolation

Each test should be independent and not rely on state from previous tests:

```typescript
beforeEach(() => {
  // Reset state before each test
  jest.clearAllMocks();
  useStore.getState().reset();
});
```

### 2. Use Descriptive Test Names

Test names should clearly describe what is being tested:

```typescript
// Good
it('should retry network errors with exponential backoff')

// Bad
it('should work')
```

### 3. Test Behavior, Not Implementation

Focus on what the code does, not how it does it:

```typescript
// Good - tests behavior
it('should update notebook title when updateNotebook is called', () => {
  // ...
  expect(notebook.title).toBe('New Title');
});

// Bad - tests implementation details
it('should call setState with new title', () => {
  // ...
  expect(setState).toHaveBeenCalledWith({ title: 'New Title' });
});
```

### 4. Mock External Dependencies

Always mock external services (Supabase, Sentry, native modules):

```typescript
jest.mock('@/lib/supabase');
jest.mock('@/lib/sentry');
```

### 5. Use TypeScript in Tests

Leverage TypeScript for type safety in tests:

```typescript
import type { Notebook } from '@/lib/store/types';

const mockNotebook: Notebook = {
  id: 'notebook-1',
  title: 'Test',
  // TypeScript will catch missing required fields
};
```

### 6. Test Error Cases

Don't just test happy paths - test error handling:

```typescript
it('should handle network errors gracefully', async () => {
  mockService.fetchData.mockRejectedValue(new Error('Network error'));
  
  await expect(loadData()).rejects.toThrow();
  expect(errorHandler.handle).toHaveBeenCalled();
});
```

### 7. Use Async/Await Properly

Always await async operations in tests:

```typescript
it('should load notebooks', async () => {
  await store.getState().loadNotebooks();
  expect(store.getState().notebooks).toHaveLength(1);
});
```

## Coverage

Generate coverage reports with:

```bash
npm run test:coverage
```

Coverage reports are generated in the `coverage/` directory. The configuration collects coverage from:
- `lib/**/*.{ts,tsx}`
- `components/**/*.{ts,tsx}`
- `hooks/**/*.{ts,tsx}`

Excludes:
- Type definition files (`*.d.ts`)
- Test files
- Node modules

## Troubleshooting

### Expo SDK 54 Compatibility

If you encounter `ReferenceError: You are trying to import a file outside of the scope of the test code`:
- This is a known issue with jest-expo and Expo SDK 54
- Try running tests with: `NODE_OPTIONS=--experimental-vm-modules npm test`
- Alternatively, you may need to wait for jest-expo updates or use a workaround
- Some tests may work while others fail - this is expected with the current jest-expo version

### Tests Not Finding Modules

If you see module resolution errors:
1. Check that path aliases are configured in `jest.config.js`
2. Verify `tsconfig.json` has matching path configuration
3. Ensure `jest.setup.js` is properly configured

### Expo Router Issues

If tests fail with Expo Router errors:
1. Ensure tests are outside the `app/` directory
2. Mock `expo-router` in your test file if needed
3. Check that `jest.setup.js` includes Expo Router mocks

### Async Issues

If async tests are flaky:
1. Use `await` for all async operations
2. Use `jest.useFakeTimers()` and `jest.advanceTimersByTime()` for timer-based code
3. Use `waitFor` from React Native Testing Library for component updates

### Type Errors

If you see TypeScript errors in tests:
1. Ensure `@types/jest` is installed
2. Check that test files use `.test.ts` or `.test.tsx` extension
3. Verify TypeScript configuration includes test files

## Adding New Tests

### For a New Utility Function

1. Create test file: `__tests__/lib/utils/myFunction.test.ts`
2. Import the function
3. Write tests for various inputs and edge cases
4. Run tests: `npm test`

### For a New Store Slice

1. Create test file: `__tests__/lib/store/slices/mySlice.test.ts`
2. Create isolated store instance
3. Test all actions and state changes
4. Mock any external dependencies (Supabase, services)

### For a New Component

1. Create test file: `__tests__/components/MyComponent.test.tsx`
2. Mock required dependencies (theme, router, etc.)
3. Test rendering and user interactions
4. Test error states and edge cases

## Continuous Integration

Tests should be run in CI/CD pipelines. Example GitHub Actions workflow:

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm test
```

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [jest-expo Documentation](https://github.com/expo/expo/tree/main/packages/jest-expo)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## Support

For questions or issues with testing:
1. Check this documentation
2. Review existing test files for examples
3. Consult the Jest and React Native Testing Library documentation
