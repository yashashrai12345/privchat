# Product Requirements Document (PRD)
## Project: PrivChat — Privacy-First Realtime Web Chat App

**Version:** 1.0
**Status:** Draft
**Owner:** Yashas

---

## 1. Overview

PrivChat is a web-based chat application built around a single core principle: **no chat history is ever visible after a session ends.** Instead of usernames or friend lists, users connect to each other through a **Unified Key (Code)** — a shared code that acts as both identity and access to a chat room. There is no persistent contact list, no stored conversation log visible to the user across sessions, and no media sharing — text-only, encrypted, realtime.

This is a "ghost chat" model: sign up once, then every future visit starts from a blank home screen. A refresh mid-chat exits the conversation entirely.

---

## 2. Goals

- Let two (or more) people chat instantly using a shared **Unified Key**, without needing to "add" or "friend" each other.
- Guarantee that nothing is visible to the user after signing in except what happens in the *current* live session.
- Deliver realtime messaging with typing indicators and last-active status.
- Keep the UI smooth, minimal, and distraction-free.
- Deploy the entire stack on **free-tier infrastructure only**.

## 3. Non-Goals (Explicitly Out of Scope)

- No image, video, or file sharing.
- No voice messages (for now).
- No persistent contact list / chat history UI.
- No "remember last chat" or auto-rejoin on refresh.
- No read receipts (not mentioned — treat as out of scope unless later requested).

---

## 4. User Roles

| Role | Description |
|---|---|
| Registered User | Has signed up once with basic credentials (e.g., email/username + password). Stays logged in via persistent session/token. |
| Chat Participant | Any registered user who enters a Unified Key to join/open a chat room. |

---

## 5. Core Concepts

### 5.1 Unified Key (Code)
- A short, shareable alphanumeric code (e.g., 8–10 characters) that represents a **chat room**.
- Anyone who has the code and is logged in can enter that chat room and start messaging.
- A user can generate a new Unified Key (creates a new room) or enter an existing one (joins an existing room).
- Multiple people can share and use the same Unified Key to join the same room (group-capable by design, even if primary use case is 1:1).
- Keys are not tied to a fixed contact — they're tied to a room/session context.

### 5.2 "See Nothing After Sign-In" Privacy Model
- On login (or app refresh), the **Home Screen always shows zero contacts, zero chat list, zero history.**
- The only way to enter a conversation is by typing/pasting a Unified Key.
- Messages exist only for the duration of the live session inside that room view.
- On page refresh, browser close, or explicit exit — the user is dropped back to the empty Home Screen. Re-entering the same code may either:
  - **Option A (recommended for "sees nothing"):** show a fresh empty room (no message history reload), or
  - **Option B:** show history only if both users are still actively present.
  - *Decision needed — see Open Questions.*

### 5.3 Persistent Login, Single Sign-Up
- Sign-up happens once.
- After that, login session persists (e.g., long-lived auth token in secure storage) — **no repeated credential prompts** on normal visits.
- Explicit **Logout button** required to end the session and force credentials on next visit.

---

## 6. Functional Requirements

### 6.1 Authentication
- FR1: User can sign up once with minimal credentials (email/username + password).
- FR2: On subsequent visits, user is auto-logged-in via stored session token (no re-entering credentials).
- FR3: Logout button clears the session token and returns user to the login screen.
- FR4: Passwords stored as salted hashes — never in plain text.

### 6.2 Home Screen
- FR5: Home Screen shows **no contact list, no recent chats, no history** — always a clean/empty state.
- FR6: Home Screen provides:
  - An input field to **enter a Unified Key** to join a chat.
  - A button to **generate a new Unified Key** (creates a new room, shown to the user to share).

### 6.3 Chat Room
- FR7: Entering a valid Unified Key opens a realtime chat room.
- FR8: Messages send/receive in realtime (sub-second latency) via WebSocket.
- FR9: **"Typing…" indicator** shown when the other participant is actively typing.
- FR10: **Last active time** shown for the other participant (e.g., "last seen 2 min ago" or "online now").
- FR11: Text-only messages. No image/video/file upload UI at all.
- FR12: Voice messages excluded from v1 scope entirely.
- FR13: All messages are **encrypted in transit** (TLS) and **encrypted at rest** if stored temporarily server-side (see Section 7).

### 6.4 Session / Refresh Behavior
- FR14: Refreshing the page while inside a chat room **exits the chat** and returns to the empty Home Screen.
- FR15: No auto-rejoin, no "resume last chat" behavior.
- FR16: Leaving/closing a room does not persist a visible chat entry anywhere in the UI.

### 6.5 UI/UX
- FR17: Clean, minimal, mobile-responsive chat interface.
- FR18: Smooth animations for message send/receive, typing indicator, and screen transitions.
- FR19: Clear visual distinction between sent/received messages.

---

## 7. Privacy & Encryption Model

| Layer | Approach |
|---|---|
| Transport | HTTPS + WSS (encrypted WebSocket) for all data in transit |
| At rest (if messages briefly persisted server-side for delivery) | Encrypted at rest, auto-purged (e.g., short TTL / delete-on-delivery or delete-on-disconnect) |
| End-to-end encryption (E2EE) | Recommended stretch goal — client-side encrypt/decrypt using a key derived from the Unified Key, so even the server can't read message content |
| Contact/history exposure | No server-side "conversation list" is ever rendered to the client after login |

**Recommendation:** Since "no history visible after sign-in" is a hard requirement, the simplest reliable approach is: **do not persist messages at all** beyond momentary in-memory relay for delivery (or persist only long enough to guarantee delivery, then purge). This avoids needing complex "hide history from UI but keep in DB" logic and reduces liability/privacy risk.

---

## 8. Technical Approach (Free-Tier Stack)

Given free-tool constraints, a lightweight realtime-friendly stack:

| Component | Suggested Free Tool |
|---|---|
| Frontend | React (Vite) or plain HTML/JS + CSS — deployed on **Vercel** or **Netlify** (free tier) |
| Realtime messaging | **Socket.IO** over Node.js, or a free realtime BaaS like **Supabase Realtime** / **Firebase Realtime Database** (free tier) |
| Backend/API | Node.js + Express, hosted free on **Render** or **Railway** free tier (for WebSocket support) |
| Auth | Firebase Auth (free tier) or Supabase Auth (free tier) — handles sign-up/login/session tokens out of the box |
| Database (minimal, for auth + ephemeral room metadata) | Supabase (Postgres, free tier) or Firebase Firestore (free tier) |
| Encryption | TLS (provided free by host), optional client-side E2EE via Web Crypto API (no extra cost) |

> Note: Render/Railway free tiers may sleep on inactivity, which can add reconnect delay — acceptable tradeoff for a free deployment.

---

## 9. User Flow Summary

1. **First visit:** User signs up (email/username + password).
2. **Every future visit:** User is auto-logged-in → lands on empty Home Screen.
3. User either:
   - Generates a Unified Key → shares it with someone → waits for them to join.
   - Enters a Unified Key they received → joins that chat room instantly.
4. Inside the room: realtime text messaging, typing indicator, last-active status.
5. User refreshes or navigates away → dropped back to empty Home Screen, room is gone from view.
6. User taps **Logout** → session ends, next visit requires login again.

---

## 10. Success Metrics

- Message delivery latency < 500ms under normal network conditions.
- Zero chat history/contacts visible on Home Screen after any login or refresh (verified via QA test case).
- Successful free-tier deployment with no paid infrastructure.
- Typing indicator and last-active-time update within 1–2 seconds of the actual event.

---

## 11. Open Questions

1. When re-entering the **same** Unified Key after a refresh, should prior messages in that room reappear (if the room still technically exists on the server), or should it always start blank? This directly affects the encryption/storage design.
2. Should a Unified Key expire after some time or after all participants leave, or persist indefinitely as a reusable room?
3. Is there a cap on how many people can join one Unified Key/room, or is it unlimited (group chat)?
4. Should there be any moderation/reporting mechanism, given there's no message history to review later?

---

## 12. Future Considerations (Not in v1)

- Voice messages.
- Image/video sharing.
- Read receipts.
- Full end-to-end encryption with per-room key exchange (recommended even for v1 if feasible).
- Push notifications.
