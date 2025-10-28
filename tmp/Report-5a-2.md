# Phase 8A-5a-2 — Firestore PURGE (Bookings Only in AI-Service)

## Removed References
- Eliminated the "დაჯავშნები" (bookings) navigation hint from the Gurulo site-guide system prompt to keep routing free of booking references.
- Updated sanitizer tests to expect the new "მენიუ → ოპერაციები" CTA instead of the old bookings path, ensuring automated checks no longer mention bookings.

## Firestore Review
- Searched ai-service/ for Firestore collection access to `bookings`/`providerBookings`; none found, so no code changes were required for Firestore queries.

## Knowledge Base Audit
- Confirmed `ai-service/knowledge_base.json` already contained no booking references.

## Test Coverage
- Adjusted the structured response sanitizer test cases to align with the updated CTA text, keeping Gurulo responses consistent without booking terminology.
