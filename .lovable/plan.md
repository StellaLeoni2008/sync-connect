# SYNC Hackathon MVP

## Goal
Build a polished, mobile-first SYNC product where two real registered people can create profiles and intents, receive a privacy-safe match, independently consent, reveal identities only after mutual acceptance, confirm meeting, and save a real connection.

## Product surfaces
- Premium public campaign page with the supplied monochrome editorial direction, product walkthroughs, honest marketing examples, event story, business model, and optional Band presentation.
- Email/password and Google authentication, password recovery, persistent sessions, and protected app areas.
- Short onboarding for real name, photo, bio, skills, and primary context.
- Four-tab mobile app: SYNC, Connections, Events, You.
- Dark anonymous discovery, real match consent, mutual reveal, meet confirmation, light connection records and graph.
- Event participation, event-specific intent, team/help needs, organizer metrics, privacy, block/report, notification preferences, and optional Band states.

## Build sequence
1. Define the SYNC design system, custom wordmark and signal mark, shared controls, mobile shell, and dark-to-light visual language.
2. Create the secure data model for profiles, skills, intents, discovery, ephemeral proximity observations, matches, responses, connections, events, needs, preferences, Bands, blocks, and reports.
3. Add strict access rules, indexes, validation triggers, private profile-photo storage, and real-time updates for match responses and connections.
4. Implement authentication and onboarding, including account recovery and profile photo upload.
5. Implement server-validated intent creation, deterministic keyword interpretation fallback, matching based on complementarity, blocks, context, active discovery, and real proximity evidence.
6. Implement the complete mutual-consent flow with anonymous pre-consent data, independent responses, real-time mutual reveal, meeting confirmation, and persisted connections.
7. Build Connections, graph, grounded connection-memory search, Events, event mode, Help, Group SYNC, organizer metrics, You, Privacy, and Band settings.
8. Build the public landing and Band campaign pages with original consistent Band visuals and clearly separated marketing examples.
9. Verify authentication, persistence, privacy boundaries, two-user consent, empty states, accessibility, mobile/desktop layouts, and database security checks.

## Technical details
- TanStack Start + React + TypeScript + Tailwind v4 using semantic OKLCH tokens and reusable shadcn-based controls.
- Lovable Cloud for authentication, Postgres, storage, real-time updates, and row-level access controls.
- App-internal trusted operations use authenticated server functions; clients never submit authoritative scores or reveal private identity data directly.
- A database transaction/function owns mutual-consent state changes and connection creation to prevent races or one-sided reveals.
- Proximity uses rotating hashed identifiers and observation interfaces only; the web app never claims native BLE/background discovery.
- AI parsing uses a server boundary with an honest deterministic fallback; no generated people or simulated activity.
- No seed social profiles, fake participants, fake acceptances, or fake live metrics.

## Initial MVP boundary
The build will make the core two-person flow and supporting screens functional. Native BLE, native push/haptics, physical Band pairing, payments, chat, and hardware firmware remain accurately represented as future native/hardware integrations rather than simulated browser features.
