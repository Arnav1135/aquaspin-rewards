# Error Handling System

## Overview

The AquaSpin Rewards application has a comprehensive error handling system designed to provide better error recovery, user feedback, and debugging. The system includes:

- **Centralized error utilities** (`src/lib/errors.ts`) for standardized error handling
- **React Error Boundary** (`src/components/ui/ErrorBoundary.tsx`) for catching component errors
- **Error categorization** and severity levels for better triage
- **Automatic error logging** with context and stack traces
- **User-friendly error messages** with recovery suggestions

---

## Core Components

### 1. Error Types

#### ErrorSeverity
```typescript
enum ErrorSeverity {
  INFO = 'info',           // Non-error informational messages
  WARNING = 'warning',     // Issues that need attention but don't stop functionality
  ERROR = 'error',         // Operational errors that need user/developer action
  CRITICAL = 'critical',   // System-breaking errors
}
```

#### ErrorCategory
```typescript
enum ErrorCategory {
  NETWORK = 'network',        // Network/API failures
  AUTH = 'auth',              // Authentication/authorization failures
  VALIDATION = 'validation',  // Input/data validation failures
  DATABASE = 'database',      // Database operation failures
  GAME_LOGIC = 'game_logic',  // Game rules/logic errors
  PAYMENT = 'payment',        // Payment processing errors
  RENDERING = 'rendering',    // Canvas/DOM rendering errors
  UNKNOWN = 'unknown',        // Uncategorized errors
}
```

### 2. Creating Errors

#### Basic Error Creation
```typescript
import { createAppError, ErrorCategory, ErrorSeverity } from '@/lib/errors';

// Create a simple error
const error = createAppError(
  'Failed to fetch user data',
  ErrorCategory.NETWORK,
  ErrorSeverity.ERROR
);

// Create an error with all options
const error = createAppError(
  'Database connection lost',
  ErrorCategory.DATABASE,
  ErrorSeverity.CRITICAL,
  {
    code: 'DB_CONN_LOST',
    userMessage: 'Unable to save your progress. Please refresh the page.',
    context: { connectionId: 'abc123', retries: 3 },
    shouldNotify: true,
    recoveryAction: async () => {
      // Attempt to reconnect
      await reconnectDatabase();
    },
  }
);
```

### 3. Handling Errors

#### Show Errors to Users
```typescript
import { handleError } from '@/lib/errors';

try {
  await someOperation();
} catch (error) {
  handleError(error, {
    showToast: true,
    toastDuration: 3000,
    fallbackMessage: 'Something went wrong. Please try again.',
    onRetry: async () => {
      // User clicked retry
      await someOperation();
    },
  });
}
```

#### Log Errors for Debugging
```typescript
import { logError } from '@/lib/errors';

try {
  await someOperation();
} catch (error) {
  logError(error, {
    context: 'operation_name',
    userId: user.id,
    timestamp: Date.now(),
  });
}
```

### 4. Wrapping Async Functions

```typescript
import { withErrorHandling } from '@/lib/errors';

const fetchUserData = withErrorHandling(
  async (userId: string) => {
    const response = await fetch(`/api/users/${userId}`);
    if (!response.ok) throw new Error('Failed to fetch');
    return response.json();
  },
  {
    category: ErrorCategory.NETWORK,
    severity: ErrorSeverity.ERROR,
    fallbackReturn: null,
    onError: (error) => {
      console.error('Failed to fetch user:', error);
    },
  }
);

// Use it
const user = await fetchUserData('user-123');
```

### 5. Retry Logic

```typescript
import { retryAsync } from '@/lib/errors';

const result = await retryAsync(
  async () => {
    return await fetchData();
  },
  {
    maxAttempts: 3,
    delayMs: 1000,
    backoffMultiplier: 1.5,
    onRetry: (attempt, error) => {
      console.log(`Retry attempt ${attempt}: ${error.message}`);
    },
  }
);
```

### 6. Safe Operations

```typescript
import { safeJsonParse, safeStorage } from '@/lib/errors';

// Safe JSON parsing
const data = safeJsonParse('{"key": "value"}', {});

// Safe localStorage
const token = safeStorage.getItem('auth_token', 'default_fallback');
safeStorage.setItem('auth_token', newToken);
safeStorage.removeItem('auth_token');
```

---

## React Components

### Error Boundary

Wrap components that might throw errors:

```typescript
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

export function GamePage() {
  return (
    <ErrorBoundary
      name="GamePage"
      fallback={(error, reset) => (
        <div>
          <p>Error: {error.message}</p>
          <button onClick={reset}>Try Again</button>
        </div>
      )}
      onError={(error, errorInfo) => {
        console.error('Game page error:', error, errorInfo);
      }}
    >
      <GameComponent />
    </ErrorBoundary>
  );
}
```

### Higher-Order Component

Wrap a component to add error boundary:

```typescript
import { withErrorBoundary } from '@/components/ui/ErrorBoundary';

const SafeGameComponent = withErrorBoundary(GameComponent, {
  name: 'GameComponent',
  fallback: (error, reset) => <ErrorFallback error={error} onRetry={reset} />,
  onError: (error, errorInfo) => {
    // Handle the error
  },
});
```

---

## Best Practices

### 1. Always Categorize Errors
```typescript
// ❌ Bad
throw new Error('Something went wrong');

// ✅ Good
throw createAppError(
  'Database query failed',
  ErrorCategory.DATABASE,
  ErrorSeverity.ERROR,
  { userMessage: 'Failed to load your data. Please try again.' }
);
```

### 2. Provide User-Friendly Messages
```typescript
// ❌ Bad
throw new Error('ECONNREFUSED: connection refused on port 5432');

// ✅ Good
throw createAppError(
  'Database connection refused',
  ErrorCategory.DATABASE,
  ErrorSeverity.ERROR,
  {
    userMessage: 'Unable to connect to the database. Please try again in a moment.',
    code: 'DB_CONNECTION_REFUSED',
  }
);
```

### 3. Include Context for Debugging
```typescript
// ✅ Good
throw createAppError(
  'User balance update failed',
  ErrorCategory.DATABASE,
  ErrorSeverity.ERROR,
  {
    context: {
      userId: user.id,
      newBalance: 1000,
      previousBalance: 500,
      operation: 'deposit',
    },
    userMessage: 'Failed to update your balance. Your tokens have not been deducted.',
  }
);
```

### 4. Use Error Boundaries for Game Components
```typescript
// ✅ Good - Wrap each game component
export function PlinkoGame({ onClose }) {
  return (
    <ErrorBoundary name="PlinkoGame">
      {/* Game content */}
    </ErrorBoundary>
  );
}
```

### 5. Graceful Degradation
```typescript
// ✅ Good - Don't break the entire app on partial failures
try {
  await updateUserStats();
} catch (error) {
  logError(error, { context: 'updateUserStats' });
  // Continue anyway - stats not critical
}

updateProfile({ tokens: newBalance });
```

### 6. Provide Recovery Options
```typescript
const error = createAppError(
  'Network connection lost',
  ErrorCategory.NETWORK,
  ErrorSeverity.WARNING,
  {
    userMessage: 'Network connection unstable. Retrying...',
    recoveryAction: async () => {
      await retryAsync(() => reconnect());
    },
  }
);
```

---

## Game Implementation Patterns

### Pattern: Bet Validation

```typescript
const validateBet = useCallback((amount: number, balance: number) => {
  if (amount <= 0) {
    return { valid: false, error: 'Bet amount must be greater than 0' };
  }
  if (amount > balance) {
    return { valid: false, error: 'Insufficient tokens for this bet' };
  }
  if (!Number.isFinite(amount)) {
    return { valid: false, error: 'Invalid bet amount' };
  }
  return { valid: true };
}, []);

// Usage
const validation = validateBet(betAmount, balance);
if (!validation.valid) {
  handleError(
    createAppError(validation.error!, ErrorCategory.VALIDATION),
    { showToast: true }
  );
  return;
}
```

### Pattern: Database Operations

```typescript
const updateUserBalance = withErrorHandling(
  async (newBalance: number) => {
    const { error } = await supabase
      .from('users')
      .update({ tokens: newBalance })
      .eq('id', userId);

    if (error) {
      throw createAppError(
        `Failed to update balance: ${error.message}`,
        ErrorCategory.DATABASE,
        ErrorSeverity.ERROR,
        {
          userMessage: 'Failed to save your progress. Please try again.',
          context: { originalError: error.message },
        }
      );
    }
    return true;
  },
  {
    category: ErrorCategory.DATABASE,
    fallbackReturn: false,
  }
);
```

### Pattern: Animation Loop Error Handling

```typescript
const gameLoop = useCallback(() => {
  try {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Render game...
    ctx.fillRect(0, 0, width, height);

    // Continue loop
    rAFRef.current = requestAnimationFrame(gameLoop);
  } catch (error) {
    logError(error, { context: 'gameLoop' });
    // Continue loop even on error
    rAFRef.current = requestAnimationFrame(gameLoop);
  }
}, []);
```

---

## Debugging

### Enable Error Analytics (Optional)

```typescript
// In your main.tsx or App.tsx
window.__ERROR_ANALYTICS__ = {
  track: (data) => {
    // Send to your analytics service
    console.log('Error tracked:', data);
  },
};
```

### View Error Logs in Console

Errors are automatically logged to the browser console with prefix:
- 🚨 CRITICAL ERROR
- ❌ ERROR
- ⚠️ WARNING
- ℹ️ INFO

### Development vs Production

In development, the Error Boundary shows:
- Error message
- Component stack trace
- Full error details

In production, the Error Boundary shows:
- User-friendly message
- Simple retry button
- "Contact support" message

---

## Migration Guide

### Updating Existing Game Components

1. **Import error utilities:**
```typescript
import {
  createAppError,
  handleError,
  logError,
  ErrorCategory,
  ErrorSeverity,
} from '@/lib/errors';
```

2. **Replace try-catch blocks:**
```typescript
// ❌ Old
try {
  await someOperation();
} catch (e) {
  // Silent failure
}

// ✅ New
try {
  await someOperation();
} catch (error) {
  handleError(error, {
    showToast: true,
    fallbackMessage: 'Operation failed. Please try again.',
  });
}
```

3. **Wrap component with ErrorBoundary:**
```typescript
// ✅ New
export function MyGame({ onClose }) {
  return (
    <ErrorBoundary name="MyGame">
      {/* Game content */}
    </ErrorBoundary>
  );
}
```

---

## Examples

See `PlinkoGame.tsx` for a complete implementation example with:
- Comprehensive error handling
- User validation
- Database error recovery
- Canvas rendering error handling
- Graceful degradation

---

## Support

For issues with the error handling system:
1. Check the browser console for error logs
2. Review the error context and stack trace
3. Refer to the patterns in `PlinkoGame.tsx`
4. Open an issue on GitHub with the error logs
