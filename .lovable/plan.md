# SYNC product and interface upgrade

## Goal
Extend the existing app without replacing authentication, profiles, matching, location discovery, mutual consent, Connections, or production data. Make the experience lighter and clearer, then add secure post-SYNC communication, consensual location sharing, and real user-created events.

## What will change

### 1. Visual system and responsive foundation
- Make the existing primary button style SYNC cyan with near-black text, plus restrained hover and pressed states.
- Keep secondary actions visually quiet and context-aware on light and dark screens.
- Give Google its own warm-white button with the official multicolor mark while preserving the current sign-in flow.
- Replace one-off action links and dark primary controls with shared controls across auth, onboarding, SYNC, matches, Connections, Events, profile, Band, errors, and password reset.
- Improve the mobile app shell, safe-area spacing, touch targets, wrapping, content widths, and desktop max-width behavior.

### 2. Shorter homepage
- Replace the long campaign page with six concise sections: hero, compact four-step flow, real-world intent examples, small Band preview, small Events preview, and final action.
- Use the existing real photography and brand assets, with one strong hero visual and short intent chips such as Learn Python, Play Soccer, Study, Grab Coffee, and Find a Teammate.
- Keep the message consumer-facing and remove repeated or technical explanations.

### 3. Connection detail and revealed profile
- Add a Connection detail screen available only to either connected person.
- Show the real revealed profile, match reason, event/context when available, and clear Profile, Message, and Location actions.
- Show skills, hobbies, interests, help topics, and active public intent; never expose email, authentication data, pre-SYNC coordinates, or other private fields.
- Upgrade Connection cards with visible quick actions and concise empty states.

### 4. Private one-to-one chat
- Add additive conversation, membership, and message tables linked to an existing Connection.
- Make a conversation available when both people mutually accept; preserve meeting confirmation as a separate optional milestone.
- Restrict conversation and message access to the two connected members, and prevent sending when either person has blocked the other.
- Add live message updates, read state, a compact transcript, timestamps, and a fixed mobile-safe composer built from the established chat primitives.

### 5. Explicit post-SYNC location sharing
- Add connection-scoped location shares with owner, recipient, coordinates, accuracy, start, expiry, and active state.
- Allow sharing for 15 minutes, one hour, or until stopped, using a fresh browser location only after explicit confirmation.
- Let only the owner and connected recipient read an unexpired share; blocked or unrelated users cannot access it.
- Put Share My Location and Stop Sharing directly on the Connection location screen. Pre-SYNC discovery remains anonymous and never reveals exact location.

### 6. Real Events
- Extend existing Events rather than replacing them: add event type, optional cover path, discovery radius, visibility details, and cancellation state while retaining the current organizer field as ownership.
- Add Upcoming, Joined, and Created by You views; event creation; event detail; join/leave; owner edit/manage controls; and real participant counts.
- Add a private event-cover storage bucket and owner-scoped upload rules if cover images are used.
- Add an organizer view with real counts for participants, active SYNC users, Connections, and help requests. Zero remains zero.
- Let joined users enter the Event SYNC Zone and start an event-scoped intent. Preserve the existing server-side same-event matching bonus and one-way matching behavior.

## Security and data rules
- Apply additive migrations only; do not drop working tables or overwrite existing data.
- Add explicit database grants, row-level access rules, indexes, update timestamps, and live-update publication where needed.
- Derive ownership from the signed-in user, not browser-supplied user IDs.
- Enforce connection membership and block checks in both access rules and authenticated server actions.
- Treat expired location shares as inaccessible even before cleanup, and never return exact discovery coordinates.

## Verification
- Run matching regression tests so Python, soccer, calculus, and coffee scenarios still work without requiring reciprocity.
- Validate database access rules and run the security linter.
- Test primary flows at 320, 375, 390, 430, 768, 1024, and 1440+ widths, including navigation, forms, chat composer, location view, Events, and Band.
- Use authenticated browser checks for the available account. Complete the two-account journey where a second test identity is available; otherwise report each unverified cross-account step explicitly rather than simulating it.
