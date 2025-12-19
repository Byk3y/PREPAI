# Zustand `useStore.getState()` Usage Pattern

## Overview

This document explains when and why we use `useStore.getState()` in our codebase, particularly in the onboarding flow.

## What is `useStore.getState()`?

`useStore.getState()` is a Zustand pattern that allows you to access the store's state **outside of React components** or **in situations where you need the latest state without subscribing to updates**.

## When to Use `getState()`

### ✅ Appropriate Use Cases

1. **Inside async callbacks or promises** (where hooks can't be used)
   - Example: After an async operation completes and you need the latest state
   - Example: In `.then()` or `.catch()` blocks

2. **One-time state reads** (when you don't need reactivity)
   - Example: Reading a value once without subscribing to changes
   - Example: Verifying state after an async operation

3. **Outside React components**
   - Example: In utility functions, event handlers, or middleware

### ❌ When NOT to Use `getState()`

1. **Inside React components for reactive state**
   - Use `useStore()` hook instead to subscribe to changes
   - Example: `const { petName } = useStore();`

2. **When you need automatic re-renders**
   - `getState()` doesn't trigger re-renders
   - Use the hook version for reactive updates

## Examples in Our Codebase

### Example 1: Onboarding Flow (index.tsx)

**Location:** `app/onboarding/index.tsx` (lines 96, 165)

**Context:** After loading pet state from the database, we need to verify the state was updated correctly.

```typescript
loadPetState()
  .then(() => {
    // After loading, get fresh state and check if pet has a custom name
    const store = useStore.getState(); // ✅ Correct: Inside async callback
    const loadedName = store.petState.name;
    
    // Only set if we got a valid custom name
    if (loadedName && loadedName !== 'Nova' && loadedName.trim() !== '') {
      setPetName((current) => {
        return current.trim() === '' ? loadedName : current;
      });
    }
  })
```

**Why `getState()` here?**
- We're inside a `.then()` callback (async context)
- We need a one-time read of the latest state
- We don't need reactivity (we're manually updating local state with `setPetName`)

### Example 2: State Verification After Update

**Location:** `app/onboarding/index.tsx` (line 165)

**Context:** After attempting to update pet name, we verify it was saved correctly.

```typescript
try {
  await updatePetName(trimmedName);
  console.log('Pet name saved to database:', trimmedName);
  saveSuccess = true;
} catch (updateError) {
  // Verify the save by checking if petState was updated
  const store = useStore.getState(); // ✅ Correct: Inside error handler
  if (store.petState.name === trimmedName) {
    saveSuccess = true;
    console.log('Pet name verified in state:', trimmedName);
  } else {
    throw new Error('Pet name was not saved to state');
  }
}
```

**Why `getState()` here?**
- We're in an error handler (async context)
- We need to verify state after an operation
- One-time read, no reactivity needed

## Best Practices

1. **Prefer hooks in components**
   ```typescript
   // ✅ Good: In component
   const { petName } = useStore();
   
   // ❌ Avoid: In component
   const petName = useStore.getState().petName;
   ```

2. **Use `getState()` in async contexts**
   ```typescript
   // ✅ Good: In async callback
   someAsyncOperation().then(() => {
     const state = useStore.getState();
   });
   
   // ✅ Good: In useEffect with async
   useEffect(() => {
     loadData().then(() => {
       const state = useStore.getState();
     });
   }, []);
   ```

3. **Document why you're using `getState()`**
   - Add a comment explaining why hooks aren't appropriate
   - Example: `// Use getState() here because we're in an async callback`

## Common Patterns

### Pattern 1: Async State Verification
```typescript
await someAsyncOperation();
const state = useStore.getState();
if (state.someValue === expectedValue) {
  // Proceed
}
```

### Pattern 2: One-time State Read
```typescript
const currentValue = useStore.getState().someValue;
// Use currentValue without subscribing to changes
```

### Pattern 3: Conditional Logic Based on State
```typescript
if (useStore.getState().isLoggedIn) {
  // Do something that doesn't need reactivity
}
```

## Summary

- **Use `useStore()` hook** when you need reactive state in components
- **Use `useStore.getState()`** when you need one-time reads in async contexts or outside React
- **Always document** why you're using `getState()` if it's not immediately obvious
- **Remember**: `getState()` doesn't trigger re-renders, so use hooks for reactive UI

## References

- [Zustand Documentation - Accessing State Outside Components](https://github.com/pmndrs/zustand#accessing-state-outside-components)
- [Zustand Best Practices](https://github.com/pmndrs/zustand#best-practices)




