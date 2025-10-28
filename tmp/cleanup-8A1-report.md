# Phase 8A-1 Cleanup Report

## Summary
- Hard-deleted the temporary `/api/bookings/*` and `/api/calendar/*` guards so the backend no longer mounts or intercepts the legacy endpoints.
- Confirmed Phase 8A-1c by verifying there are zero Express mounts for `/api/bookings` or `/api/calendar`, leaving the standard 404 handler to respond.

## Files touched
- `backend/index.js`
- `functions/index.js`

## Proof of removal
- Removed the guard registration in `backend/index.js`:
  ```diff
  -// Phase 8A-1 cleanup: permanently retire legacy bookings/calendar APIs.
  -const removedApiPrefixes = [
  -  { prefix: '/api/bookings', reason: 'Legacy bookings API removed (Phase 8A-1 cleanup)' },
  -  { prefix: '/api/calendar', reason: 'Legacy calendar API removed (Phase 8A-1 cleanup)' },
  -];
  -
  -removedApiPrefixes.forEach(({ prefix, reason }) => {
  -  const patterns = [prefix, `${prefix}/*`];
  -  app.all(patterns, (req, res) => {
  -    res.status(410).json({ success: false, error: 'ENDPOINT_REMOVED', message: reason });
  -  });
  -});
  ```

## Phase 8A-1c verification
- Re-ran repository-wide searches for the Phase 8A-1c targets:
  - `app.use('/api/bookings` → **Before:** 0 hits, **After:** 0 hits
  - `app.use("/api/bookings` → **Before:** 0 hits, **After:** 0 hits
  - `app.use('/api/calendar` → **Before:** 0 hits, **After:** 0 hits
  - `app.use("/api/calendar` → **Before:** 0 hits, **After:** 0 hits
- Inspected `backend/index.js`, `backend/routes/*`, and Firebase entrypoints to confirm there are no lingering bookings/calendar imports or mounts.
- No dedicated booking or calendar router files were present to delete under `backend/routes` or `functions/src/backend/routes`.
- With the guards retired and no mounts remaining, `/api/bookings/*` and `/api/calendar/*` resolve to the shared not-found handler (404).

## Verification
- Searched the backend route registrations to ensure no remaining `bookings` or `calendar` mounts are active.
- Confirmed the Firebase Functions build passes.

## Testing
- `pnpm -C functions build`
