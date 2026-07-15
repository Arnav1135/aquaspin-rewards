# Error Handling - Quick Reference

## TL;DR - Common Patterns

### Pattern 1: Simple Error Handling
```typescript
import { handleError } from '@/lib/errors';

try {
  await someOperation();
} catch (error) {
  handleError(error, { showToast: true });
}
```

### Pattern 2: Categorized Error Creation
```typescript
import { createAppError, ErrorCategory, ErrorSeverity } from '@/lib/errors';

throw createAppError(
  'Operation failed',
  ErrorCategory.NETWORK,
  ErrorSeverity.ERROR,
  { userMessage: 'Connection failed. Please try again.' }
);
```

### Pattern 3: Wrap Component with Error Boundary
```typescript
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

export function MyGame() {
  return (
    <ErrorBoundary name="MyGame">
      <GameContent />
    </ErrorBoundary>
  );
}
```

### Pattern 4: Validate User Input
```typescript
const validateInput = (value: string): { valid: boolean; error?: string } => {
  if (!value) return { valid: false, error: 'Required field' };
  if (value.length < 3) return { valid: false, error: 'Too short' };
  return { valid: true };
};

const validation = validateInput(userInput);
if (!validation.valid) {
  handleError(createAppError(validation.error!, ErrorCategory.VALIDATION));
  return;
}
```

### Pattern 5: Database Operations
```typescript
import { withErrorHandling } from '@/lib/errors';

const updateBalance = withErrorHandling(
  async (newBalance: number) => {
    const { error } = await supabase
      .from('users')
      .update({ tokens: newBalance })
      .eq('id', userId);
    if (error) throw error;
    return true;
  },
  {
    category: ErrorCategory.DATABASE,
    fallbackReturn: false,
  }
);

const success = await updateBalance(1000);
```

### Pattern 6: Retry Failed Operations
```typescript
import { retryAsync } from '@/lib/errors';

const result = await retryAsync(
  () => fetchData(),
  {
    maxAttempts: 3,
    delayMs: 1000,
    backoffMultiplier: 1.5,
  }
);
```

---

## Error Categories

| Category | When to Use | Example |
|----------|-----------|---------|
| **NETWORK** | API/fetch failures | Failed to reach server |
| **AUTH** | Login/auth failures | Invalid credentials |
| **VALIDATION** | Bad user input | Bet exceeds balance |
| **DATABASE** | DB operation failures | SQL error, connection lost |
| **GAME_LOGIC** | Game rule violations | Invalid move, cheating detected |
| **PAYMENT** | Payment processing errors | Deposit failed |
| **RENDERING** | Canvas/DOM errors | WebGL not available |
| **UNKNOWN** | Unclassified errors | Generic fallback |

---

## Error Severity

| Severity | When to Use | User Sees | Dev Sees |
|----------|-----------|-----------|----------|
| **INFO** | Informational | ℹ️ Toast | ℹ️ Console |
| **WARNING** | Non-critical issue | ⚠️ Toast | ⚠️ Warning |
| **ERROR** | Operation failed | ❌ Error toast | ❌ Error log |
| **CRITICAL** | System broken | ❌ Error dialog | 🚨 Critical log |

---

## Imports Cheat Sheet

```typescript
// Error creation
import { createAppError } from '@/lib/errors';

// Error handling
import { handleError, logError } from '@/lib/errors';

// Error utilities
import { 
  withErrorHandling, 
  retryAsync, 
  safeJsonParse, 
  safeStorage 
} from '@/lib/errors';

// Enums
import { 
  ErrorCategory, 
  ErrorSeverity 
} from '@/lib/errors';

// React components
import { 
  ErrorBoundary, 
  withErrorBoundary 
} from '@/components/ui/ErrorBoundary';
```

---

## Real-World Examples from PlinkoGame

### Bet Validation
```typescript
const validateBet = useCallback(
  (amount: number, balance: number): { valid: boolean; error?: string } => {
    if (amount <= 0) return { valid: false, error: 'Must be > 0' };
    if (amount > balance) return { valid: false, error: 'Insufficient' };
    if (!Number.isFinite(amount)) return { valid: false, error: 'Invalid' };
    return { valid: true };
  },
  []
);
```

### Database Update with Recovery
```typescript
const updateUserBalance = useCallback(
  withErrorHandling(
    async (newBalance: number) => {
      const { error } = await supabase
        .from('users')
        .update({ tokens: newBalance })
        .eq('id', pr.id);
      
      if (error) {
        throw createAppError(
          `Update failed: ${error.message}`,
          ErrorCategory.DATABASE,
          ErrorSeverity.ERROR,
          { userMessage: 'Failed to update balance. Please try again.' }
        );
      }
      return true;
    },
    {
      category: ErrorCategory.DATABASE,
      fallbackReturn: false,
    }
  ),
  []
);
```

### Physics Loop Error Handling
```typescript
const gameLoop = useCallback(() => {
  try {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      logError(createAppError('No canvas context', ErrorCategory.RENDERING));
      return;
    }

    // Game logic here...
    
    rAFRef.current = requestAnimationFrame(gameLoop);
  } catch (error) {
    logError(error, { context: 'gameLoop' });
    rAFRef.current = requestAnimationFrame(gameLoop);
  }
}, []);
```

---

## Common Mistakes to Avoid

### ❌ Don't: Silent Failures
```typescript
try {
  await updateBalance();
} catch (e) {
  // Silent failure - bad!
}
```

### ✅ Do: Log and Notify
```typescript
try {
  await updateBalance();
} catch (error) {
  handleError(error, { showToast: true });
}
```

---

### ❌ Don't: Generic Error Messages
```typescript
throw new Error('Error');
```

### ✅ Do: Specific, Helpful Messages
```typescript
throw createAppError(
  'Database connection failed',
  ErrorCategory.DATABASE,
  ErrorSeverity.ERROR,
  { userMessage: 'Unable to save. Check your connection.' }
);
```

---

### ❌ Don't: Forget Error Boundaries
```typescript
export function GameComponent() {
  return <GameLogic />;
}
```

### ✅ Do: Wrap with ErrorBoundary
```typescript
export function GameComponent() {
  return (
    <ErrorBoundary name="GameComponent">
      <GameLogic />
    </ErrorBoundary>
  );
}
```

---

### ❌ Don't: No Validation
```typescript
const handleBet = async (amount: number) => {
  await placeBet(amount);
};
```

### ✅ Do: Validate Before Operation
```typescript
const handleBet = async (amount: number) => {
  const validation = validateBet(amount, balance);
  if (!validation.valid) {
    handleError(createAppError(validation.error!));
    return;
  }
  await placeBet(amount);
};
```

---

## Debug Checklist

- [ ] Is error being logged? (Check console)
- [ ] Is user seeing toast message? (Should be visible)
- [ ] Is error categorized correctly? (Check error.category)
- [ ] Is context included for debugging? (Check error.context)
- [ ] Can user recover? (Retry button, fallback action)
- [ ] Is operation continued? (Or gracefully stopped?)

---

## Testing Your Error Handling

### Test 1: Validation Error
```typescript
// Try to place invalid bet
1. Bet amount = 0 → See "Bet must be > 0"
2. Bet amount > balance → See "Insufficient tokens"
3. Bet amount = -100 → See "Invalid bet amount"
```

### Test 2: Network Error
```typescript
// Disable network in DevTools
1. Open DevTools → Network tab
2. Check "Offline"
3. Try to play game
4. See graceful error message
5. Recover when network back
```

### Test 3: Component Error
```typescript
// Trigger rendering error
1. Open browser console
2. See "PlinkoGame Error" with fallback UI
3. Click "Try Again" button
4. Component recovers
```

---

## Environment Variables (Future)

```env
# Optional: Send errors to external service
VITE_ERROR_TRACKING_ENABLED=true
VITE_ERROR_TRACKING_URL=https://errors.example.com/api/log
VITE_ERROR_TRACKING_API_KEY=your-api-key
```

---

## Further Reading

- Full guide: `docs/ERROR_HANDLING.md`
- Plinko details: `docs/PLINKO_IMPLEMENTATION.md`
- Source code: `src/lib/errors.ts`
- Component code: `src/components/ui/ErrorBoundary.tsx`
