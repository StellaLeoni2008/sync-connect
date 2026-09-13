# Roadmap

- [x] Global primary/secondary action styling
- [x] Shorter landing page
- [x] Responsive layouts across core screens
- [x] Connection detail and mutually revealed profiles
- [x] Private realtime chat with strict access controls
- [x] Expiring location sharing for connections
- [x] Event creation, joining, detail, organizer controls
- [x] Edit profile, SYNC vibration, logo header, guest sign-in
- [x] Proximity radar on the SYNC page with tap-to-preview and Request Sync
- [x] Proximity-first matching (skills only add context)
- [x] Functional events: uppercase types fixed, participant limit, Full state
- [x] Four notification switches with a 30-minute nearby cooldown
- [x] Radar animations, blip entrance, haptics, success state, skeletons
- [x] Official clickable SYNC logo across all branded placements
- [x] Full responsive SYNC Band product showcase on the home page

## Done — 2026-09-12 (app icon, session persistence, push)
- [x] Official SYNC app icon: favicon (PNG), apple-touch-icon, 192/512 + maskable icons, web app manifest for iOS/Android/desktop install.
- [x] Session persistence: protected routes read the stored session first, so refreshes, tab switches, restarts and the installed app never bounce to sign-in.
- [x] Background web push: `push_subscriptions` table, VAPID keys, `/sw.js` push worker, device registration, pushes for sync requests, accepted syncs, new matches, chat messages and event cancellations; permission asked when alerts are turned on or the radar starts.
