# Fix concurrent request dropping in submitQuery

## TLDR

This PR fixes issue #3161 where concurrent requests to `submitQuery` were being silently dropped if they arrived while Gemini was responding. The fix implements a simple queue mechanism that buffers incoming prompts during busy periods and processes them sequentially once the stream returns to idle state.

Key changes:

- Added `pendingQueryQueueRef` to buffer requests that arrive while Gemini is busy
- Modified guard condition in `submitQuery` to queue requests instead of dropping them
- Added `useEffect` to process queued requests when `streamingState` transitions to `Idle`
- Preserves existing behavior for continuation requests (tool responses) which bypass the queue

## Dive Deeper

The root cause was in `useGeminiStream.ts` where the guard condition would immediately return if `streamingState` was `Responding` or `WaitingForConfirmation`, causing the second request to be lost:

```typescript
// Before: Silent drop
if (
  (streamingState === StreamingState.Responding ||
    streamingState === StreamingState.WaitingForConfirmation) &&
  !options?.isContinuation
)
  return; // Request lost forever!
```

Now requests are queued and processed in order:

```typescript
// After: Queue for later processing
if (
  (streamingState === StreamingState.Responding ||
    streamingState === StreamingState.WaitingForConfirmation) &&
  !options?.isContinuation
) {
  pendingQueryQueueRef.current.push({ query, options });
  return;
}
```

The solution is intentionally simple - a FIFO queue that processes one request at a time. This ensures:

1. No user prompts are lost
2. Sequential processing maintains conversation flow
3. Tool responses (continuations) still have priority
4. Minimal performance impact with deferred processing

## Reviewer Test Plan

To test this fix:

1. **Pull and build the changes:**

   ```bash
   npm install
   npm run build
   ```

2. **Test concurrent request scenario:**
   - Start the CLI: `npm run start`
   - Send a prompt that will take time to respond (e.g., "Explain quantum computing in detail")
   - While Gemini is responding, quickly send another prompt
   - Verify the second prompt is processed after the first completes (not dropped)

3. **Test A2A scenario (if available):**
   - Set up two Gemini CLI instances with A2A communication
   - Have one instance send a message while the other is processing
   - Verify both messages are handled correctly

4. **Regression testing:**
   - Verify normal single prompts still work correctly
   - Verify tool responses and continuations work as before
   - Test cancellation with ESC key during queued requests

5. **Edge cases to verify:**
   - Multiple rapid requests queue correctly
   - Queue processes in correct order (FIFO)
   - Cancelled requests don't affect queued ones

## Testing Matrix

|          | 🍏  | 🪟  | 🐧  |
| -------- | --- | --- | --- |
| npm run  | ✅  | ❓  | ❓  |
| npx      | ❓  | ❓  | ❓  |
| Docker   | ❓  | ❓  | ❓  |
| Podman   | ❓  | -   | -   |
| Seatbelt | ❓  | -   | -   |

_Tested on macOS with npm run. Other platforms need verification._

## Linked issues / bugs

Fixes #3161
