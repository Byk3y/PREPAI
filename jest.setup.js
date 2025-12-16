/**
 * Jest Setup File
 * Configures mocks and test environment before running tests
 * Using CommonJS for compatibility with jest-expo
 */

// Mock Expo modules
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: () => false,
  }),
  useSegments: () => [],
  usePathname: () => '/',
  useLocalSearchParams: () => ({}),
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {},
    },
  },
}));

jest.mock('expo-device', () => ({
  isDevice: true,
  brand: 'Apple',
  modelName: 'iPhone',
  osName: 'iOS',
  osVersion: '15.0',
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

// Mock Supabase client
jest.mock('@/lib/supabase', () => {
  const mockSupabaseClient = {
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signInWithPassword: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signOut: jest.fn(() => Promise.resolve({ error: null })),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    functions: {
      invoke: jest.fn(() => Promise.resolve({ data: null, error: null })),
    },
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(() => Promise.resolve({ data: null, error: null })),
        download: jest.fn(() => Promise.resolve({ data: null, error: null })),
        remove: jest.fn(() => Promise.resolve({ data: null, error: null })),
        getPublicUrl: jest.fn(() => ({ data: { publicUrl: '' } })),
      })),
    },
  };

  return {
    supabase: mockSupabaseClient,
  };
});

// Mock Sentry - don't send errors during tests
jest.mock('@/lib/sentry', () => ({
  initSentry: jest.fn(),
  captureAppError: jest.fn(),
  captureError: jest.fn(),
  setUser: jest.fn(),
  clearUser: jest.fn(),
  addBreadcrumb: jest.fn(),
}));

// Mock React Native Platform (needed for expo-modules-core)
// For component tests, @testing-library/react-native will handle react-native mocking
// We just need Platform for expo-modules-core
jest.mock('react-native', () => {
  // Only provide minimal mocks needed for non-component tests
  // Component tests will use @testing-library/react-native's setup
  return {
    Platform: {
      OS: 'ios',
      Version: '15.0',
      select: jest.fn((obj) => obj.ios || obj.default),
    },
  };
}, { virtual: true });

// Mock expo-image-manipulator (uses expo-modules-core which needs Platform)
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(() => Promise.resolve({ uri: 'mock-uri', width: 100, height: 100 })),
  saveAsync: jest.fn(() => Promise.resolve({ uri: 'mock-saved-uri' })),
}));

// Mock SafeAreaView
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Mock expo-av
jest.mock('expo-av', () => ({
  Audio: {
    Sound: jest.fn(),
    setAudioModeAsync: jest.fn(),
  },
}));

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
}));

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Set up global test environment variables
global.__DEV__ = true;

// Suppress console warnings in tests (optional - remove if you want to see warnings)
const originalWarn = console.warn;
const originalError = console.error;

beforeAll(() => {
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.warn = originalWarn;
  console.error = originalError;
});


