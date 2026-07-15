# Phase 2 & 3: Game Expansion & Global Error Setup

## Phase 2: New Games with Error Handling ✅ IN PROGRESS

### Games Completed

#### 1. Dragon Tiger - ENHANCED ✅
- **File**: `src/components/games/DragonTigerGame.tsx`
- **Status**: Enhanced with full error handling
- **Features**:
  - ✅ Bet validation with detailed error messages
  - ✅ Database error recovery
  - ✅ Game result tracking
  - ✅ Free trial support
  - ✅ ErrorBoundary wrapper
  - ✅ User-friendly error feedback

#### 2. Coin Flip - NEW ✅
- **File**: `src/components/games/CoinFlipGame.tsx`
- **Status**: Complete with full error handling
- **Features**:
  - ✅ 50/50 probability mechanics
  - ✅ Comprehensive error handling
  - ✅ Real-time animation
  - ✅ Database integration
  - ✅ Payout calculation (1.98x multiplier, 1% edge)
  - ✅ Full error recovery

#### 3. Crash - EXISTING (Ready for Enhancement)
- **File**: `src/components/games/CrashGame.tsx`
- **Status**: Existing implementation (needs error handling pass)
- **Next Step**: Add error handling similar to Dragon Tiger

### Games Pending

#### 🟡 High Priority
- **Mines** - Grid-based reveal game (PixiJS rendering)
- **Roulette** - Wheel game (extend existing)
- **Limbo** - Target-based multiplier game

#### 🟢 Medium Priority
- **Plinko** - Already enhanced in Phase 1 ✅
- **Chicken** - Similar to Mines grid

---

## Phase 3: Global Error Handling Setup ✅ IN PROGRESS

### 1. Global Error Handler Setup

**File**: `src/main.tsx` - UPDATED ✅

```typescript
import { setupGlobalErrorHandlers } from '@/lib/errors';

// Initialize global error handlers at app startup
setupGlobalErrorHandlers();
```

**What it does**:
- Catches all unhandled promise rejections
- Catches window errors
- Logs errors with full context
- Prevents white screen of death

### 2. Error Analytics Integration (Optional)

**Configuration**:

```typescript
// In src/main.tsx or your app initialization
window.__ERROR_ANALYTICS__ = {
  track: (data) => {
    // Send to external service (Sentry, Rollbar, DataDog, etc.)
    fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).catch(console.error);
  }
};
```

**Optional Services**:
- **Sentry** - Full-featured error tracking
- **Rollbar** - Real-time error monitoring
- **LogRocket** - Session replay + errors
- **DataDog** - APM + error tracking

### 3. Error Logging Endpoint (Backend)

Create API endpoint to receive error logs:

```typescript
// Backend: POST /api/errors
app.post('/api/errors', async (req, res) => {
  const errorData = req.body;
  
  // Log to database
  await db.insert('error_logs', {
    timestamp: new Date(errorData.timestamp),
    severity: errorData.severity,
    category: errorData.category,
    message: errorData.message,
    context: errorData.context,
    stack: errorData.stack,
    userId: getUserIdFromToken(req),
  });

  // Alert if critical
  if (errorData.severity === 'critical') {
    await notifyAdmins(errorData);
  }

  res.json({ received: true });
});
```

### 4. Error Dashboard (Optional)

Create a dashboard to monitor errors:

```typescript
// src/pages/admin/ErrorDashboard.tsx
export function ErrorDashboard() {
  const [errors, setErrors] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    critical: 0,
    byCategory: {},
  });

  useEffect(() => {
    fetchErrors().then(data => {
      setErrors(data);
      analyzeErrors(data);
    });
  }, []);

  return (
    <div>
      <h1>Error Dashboard</h1>
      <Stats stats={stats} />
      <ErrorTable errors={errors} />
    </div>
  );
}
```

---

## Integration Checklist

### Phase 2: Games with Error Handling

- [x] **Dragon Tiger** - Enhanced with full error handling
- [x] **Coin Flip** - New game with error handling
- [ ] **Crash** - Add error handling to existing game
- [ ] **Mines** - Create new game with error handling
- [ ] **Roulette** - Enhance existing with error handling
- [ ] **Limbo** - Create new game with error handling

### Phase 3: Global Setup

- [x] **Global Error Handlers** - Added to `src/main.tsx`
- [ ] **Error Analytics Integration** - Configure service
- [ ] **Error Logging Endpoint** - Create backend API
- [ ] **Error Dashboard** - Optional monitoring UI
- [ ] **Testing** - Test all error scenarios

---

## Error Handling Pattern for New Games

### Template for New Games

```typescript
// src/components/games/NewGame.tsx
import { useState, useCallback, useRef } from 'react';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import {
  createAppError,
  handleError,
  logError,
  withErrorHandling,
  ErrorCategory,
  ErrorSeverity,
} from '@/lib/errors';

export function NewGame({ onClose }: GameProps) {
  const { profile, updateProfile } = useAuthStore();
  const [betAmount, setBetAmount] = useState(50);
  
  // Refs for state management
  const profileRef = useRef(profile);
  const balanceRef = useRef(profile?.tokens ?? 0);

  // 1. Validation function
  const validateBet = useCallback((): { valid: boolean; error?: string } => {
    if (betAmount <= 0) return { valid: false, error: 'Bet must be > 0' };
    if (betAmount > balance) return { valid: false, error: 'Insufficient tokens' };
    return { valid: true };
  }, [betAmount, balance]);

  // 2. Database update with error handling
  const updateUserBalance = useCallback(
    withErrorHandling(
      async (newBalance: number) => {
        const pr = profileRef.current;
        if (!pr || pr.id.startsWith('guest')) return true;

        const { error } = await supabase
          .from('users')
          .update({ tokens: newBalance })
          .eq('id', pr.id);

        if (error) throw error;
        return true;
      },
      { category: ErrorCategory.DATABASE, fallbackReturn: false }
    ),
    []
  );

  // 3. Game action with error handling
  const handleAction = useCallback(async () => {
    try {
      // Validate input
      const validation = validateBet();
      if (!validation.valid) {
        handleError(createAppError(validation.error!, ErrorCategory.VALIDATION));
        return;
      }

      // Deduct bet
      const newBalance = balanceRef.current - betAmount;
      const success = await updateUserBalance(newBalance);
      if (!success) throw new Error('Failed to update balance');

      // Game logic
      const result = playGame();

      // Calculate winnings
      const earned = calculateWinnings(result);
      const finalBalance = newBalance + earned;

      // Update database
      await updateUserBalance(finalBalance);
      updateProfile({ tokens: finalBalance });

      // User feedback
      toast.success(`Won ${earned} tokens!`);
    } catch (error) {
      handleError(error, { showToast: true });
    }
  }, [validateBet, updateUserBalance, betAmount]);

  // 4. Wrap with ErrorBoundary
  return (
    <ErrorBoundary name="NewGame">
      <div>
        {/* Game UI */}
        <Button onClick={handleAction}>Play</Button>
      </div>
    </ErrorBoundary>
  );
}
```

---

## Testing Checklist

### Unit Tests
- [ ] Error creation and categorization
- [ ] Error boundary catching
- [ ] Bet validation logic
- [ ] Payout calculations
- [ ] Database error recovery

### Integration Tests
- [ ] Full game flow with valid input
- [ ] Full game flow with validation errors
- [ ] Database connection failure
- [ ] Network disconnection during game
- [ ] Balance update recovery

### E2E Tests
- [ ] Play complete game from start to finish
- [ ] Place bet → play → cash out/lose
- [ ] Error scenarios with user recovery
- [ ] Mobile responsiveness
- [ ] Offline detection

---

## Performance Optimization

### Code Splitting
```typescript
// Lazy load game components
const DragonTigerGame = lazy(() => 
  import('@/components/games/DragonTigerGame')
);
const CoinFlipGame = lazy(() => 
  import('@/components/games/CoinFlipGame')
);
```

### Error Boundary Per Game
- Each game wrapped in its own ErrorBoundary
- One game error doesn't crash entire app
- Independent error recovery

### Database Optimization
- Batch updates when possible
- Use transactions for critical operations
- Implement connection pooling

---

## Monitoring & Alerts

### Error Thresholds
```typescript
// Alert if error rate exceeds threshold
if (errorRate > 0.05) { // 5% error rate
  notifyAdmins('High error rate detected');
}

// Alert on critical errors
if (severity === 'critical') {
  notifyAdmins('Critical error occurred', error);
  rollbar.critical(error);
}
```

### Metrics to Track
- Error rate by game
- Error rate by category
- Error recovery success rate
- User impact (affected users)
- Performance impact

---

## Rollback Plan

If Phase 3 global setup causes issues:

1. **Disable error analytics**:
   - Comment out window.__ERROR_ANALYTICS__ assignment
   - Remove external service integration

2. **Revert global handlers**:
   - Remove setupGlobalErrorHandlers() call
   - Use try-catch in game components only

3. **Local error logging only**:
   - Keep console logs and local logError()
   - Disable external API calls

---

## Timeline

### Phase 2: Game Enhancement
- **Dragon Tiger**: 1 hour ✅
- **Coin Flip**: 1.5 hours ✅
- **Crash**: 1 hour (pending)
- **Mines, Roulette, Limbo**: 2-3 hours each
- **Total**: 7-9 hours

### Phase 3: Global Setup
- **Global handlers**: 0.5 hours ✅
- **Analytics integration**: 1-2 hours
- **Dashboard**: 2-3 hours
- **Testing**: 2-3 hours
- **Total**: 5.5-8.5 hours

---

## Next Steps

1. **Immediate**:
   - Verify Dragon Tiger and Coin Flip work correctly
   - Add error handling to Crash game
   - Test all error scenarios

2. **Short term**:
   - Enhance remaining games (Mines, Roulette, Limbo)
   - Setup error analytics service
   - Create error dashboard

3. **Medium term**:
   - Monitor error metrics
   - Optimize based on real-world usage
   - Add additional error recovery strategies

---

## FAQ

**Q: Do all games need error handling?**
A: Yes. Every game should be wrapped with ErrorBoundary and use handleError() for user-facing operations.

**Q: What if the database is down?**
A: withErrorHandling() catches DB errors and returns fallback value. Games degrade gracefully - balance updates may fail but game continues locally.

**Q: How do I test error scenarios?**
A: Use DevTools to disable network, break database connection, or inject errors via console for testing.

**Q: Should I use external error tracking?**
A: Recommended for production. Sentry/Rollbar provide crash reporting, session context, and alerting.

**Q: Can I customize error messages?**
A: Yes, use userMessage field in createAppError() to show different message to users vs logs.

---

## Resources

- **Error Handling Guide**: `docs/ERROR_HANDLING.md`
- **Plinko Implementation**: `docs/PLINKO_IMPLEMENTATION.md`
- **Quick Reference**: `docs/QUICK_REFERENCE.md`
- **Source Code**: `src/lib/errors.ts`, `src/components/ui/ErrorBoundary.tsx`

---

## Support

For issues or questions:
1. Check error logs in browser console
2. Review documentation
3. Test with simplified example
4. Open GitHub issue with error logs

---

Version: 2.0 | Last Updated: July 2026
