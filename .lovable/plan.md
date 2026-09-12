# SYNC: proximity radar and a much simpler app

Proximity first. Connection second. Skills give context.

The whole app collapses to one flow: open SYNC → see people nearby on a radar → tap someone → read their profile → Request Sync → connect. Nothing about the blue/light SYNC look, the database, chat, connections, location sharing or events goes away.

## 1. The SYNC page becomes a radar

The current "choose a mode, write what you need, press start" screen is replaced by a single screen:

- One big button: **Start / Stop** discovery. That's the only decision on first open.
- A live radar with you in the centre and rings for distance. Nearby SYNC users appear as small circular avatars placed by how close they are — closest to the middle. Avatars fade in as they appear, the rings sweep gently, and a soft pulse plays when someone new is detected.
- A small live count ("3 people nearby right now").
- Tapping an avatar opens a bottom sheet with their photo, name, bio, interests, what they can teach, what they want to learn, distance ("about 40 m away") and one clear **Request Sync** button.
- Optional one-line "What are you up to?" field, tucked behind a small link, kept only because it feeds better recommendations. Never required.

Exact coordinates are never sent to anyone — the radar receives only a distance band and a direction, computed on the server.

## 2. Requesting a Sync

- Request Sync sends the request instantly. The other person gets "Alex is nearby and wants to Sync with you." with **Accept** and **Decline**.
- Accept creates the connection and unlocks the existing profile, chat and location-sharing features exactly as they work today. A short success animation and a phone buzz play on both sides.
- Decline quietly closes it and that person stops being suggested for a while.
- Requests and incoming invitations show as a small badge on the SYNC tab.

## 3. Easier matching

Being nearby is enough to be discoverable. Order of priority becomes: nearby → currently available → shared interests/skills → compatibility. Skills only sort the radar and write the "why you two might click" line; they never hide anyone. The old automatic mutual-match creation stays for strong matches, so nothing that works today breaks.

## 4. Events that work

- Events page gets a prominent **+ Create Event** button and a shorter list.
- Creation asks for name, description, date, time, location, optional participant limit, public/private. Saving returns straight to the new event, which appears immediately in the list.
- Public events happening near you get a "Nearby" section.
- Joining respects the participant limit and shows "Full" when reached.

## 5. Notification settings

- Permission is requested the first time discovery starts, with one plain sentence of why.
- Four independent switches: People nearby, Sync requests, New messages, Nearby events.
- "People nearby" has a cooldown so it can fire at most once every 30 minutes.

## 6. Simplification pass

Long explanation blocks, duplicated cards and secondary options are trimmed on the SYNC, Connections, Events and You screens. Details move behind taps. Bottom navigation stays four tabs. Loading states become simple skeletons instead of blank screens.

## Technical notes

- Migration (additive): `notification_preferences` gains `people_nearby`, `sync_requests`, `new_messages`, `nearby_events`; `events` gains `participant_limit`; `match_candidates` gains `origin` ('AUTO' | 'REQUEST'); `notifications.kind` allows `SYNC_REQUEST`. Existing rows keep working.
- New server functions in `src/lib/sync.functions.ts`: `getNearbyPeople` (returns public profile fields, rounded distance, bearing, signed avatar URL — never coordinates), `requestSync` (admin-side insert of a `match_candidates` row with `origin='REQUEST'`, the requester's own `INTERESTED` response, and a notification), `respondToSyncRequest` (accept writes `INTERESTED` so the existing MUTUAL trigger creates the connection/conversation; decline writes `NOT_NOW`).
- `scoreMatch` in `src/lib/matching.ts` keeps its scoring but eligibility becomes proximity + freshness; tag overlap becomes a score/reason contributor. Existing matching tests updated for the new rule.
- New `src/components/sync/radar.tsx` (radar + avatar placement + animations) and `src/components/sync/person-sheet.tsx`; `proximity-field.tsx` stays for other screens.
- Animations via CSS keyframes in `src/styles.css`; haptics reuse `src/lib/haptics.ts`.
- Realtime subscriptions on `match_candidates` / `notifications` for instant request delivery.
