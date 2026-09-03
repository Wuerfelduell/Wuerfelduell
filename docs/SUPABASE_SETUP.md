# DiceDuel Supabase online backend

Supabase is the active backend for DiceDuel accounts, cloud saves, private lobbies, Realtime match state, actions, rematches, and reconnects. Local storage remains the offline cache. The previous Firebase implementation stays in the bundle as a config-only fallback.

The already-created `Profiles` table is intentionally preserved. The foundation does not rename, drop, or rewrite it: its visible `id`, `username`, and `level` fields can remain the public game-profile layer. `dd_accounts` is a private Auth mirror and `dd_account_saves` stores the full protected save. Mapping `Profiles.id` to `auth.users.id` and its exact RLS policies should be done only after the complete `Profiles` schema is confirmed.

## What is already implemented

- Supabase Auth adapter for email/password accounts.
- One revision-protected JSON save per authenticated user.
- PostgreSQL tables for rooms, members, match state, queued actions, visual events, and post-match choices.
- RLS on every public table. Clients receive `SELECT` only; mutations go through validated RPC functions.
- Six-character private room codes and atomic create/join/ready/start/leave functions.
- Sequence and interaction-owner validation before an online action is queued.
- Protected action RPC used directly by the browser; the optional JWT-checked `battle-action` Edge Function remains available for a later server-engine phase.
- Realtime subscription adapter that refreshes one authorized room snapshot plus recent actions and visual events.
- Automatic reconnect to the latest active lobby or match for the current Supabase identity.
- Anonymous Supabase identities prepared for players who want to play online without creating an email account.
- Browser and Edge Function clients pinned to `@supabase/supabase-js` 2.114.0.

## 1. Create and link the project

Choose a European Supabase region. With the Supabase CLI installed:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

If the Edge Function is wanted for future server-side battle work, deploy it separately with `supabase functions deploy battle-action --no-verify-jwt`. The current lobby and match transport does not require that deployment: it calls the same protected action RPC directly.

Without the CLI, run `supabase/manual/diceduel_backend_foundation_batch_1.sql` and then `supabase/manual/diceduel_backend_foundation_batch_2.sql` once in the SQL Editor.

## 2. Configure Auth

In Supabase Auth settings:

1. Enable email/password sign-up.
2. Enable anonymous sign-ins for account-free private battles.
3. Set the production Site URL to the deployed DiceDuel URL.
4. Add local and GitHub Pages URLs to the redirect allow-list.

Suggested URLs:

```text
http://localhost:8000
https://wuerfelduell.github.io/Wuerfelduell/
```

## 3. Add the public browser values

Edit `js/backend-config.js`:

```js
window.DICEDUEL_BACKEND_CONFIG={
  accountProvider:"supabase",
  onlineProvider:"supabase",
  supabase:{
    projectUrl:"https://YOUR_PROJECT_REF.supabase.co",
    publishableKey:"YOUR_PUBLISHABLE_OR_ANON_KEY",
    battleActionFunction:"battle-action",
    anonymousOnlineAuth:true
  }
};
```

Only the publishable/anon key belongs in browser code. Never add `service_role`, database passwords, access tokens, or CLI credentials.

Once these public values exist, the Account screen automatically replaces the local mock with Supabase Auth and cloud saves. The runtime rejects a JWT whose role is `service_role`.

## 4. Battle cutover status

`window.WDSupabaseBattleBackend` exposes:

- `identity()`
- `createRoom()` / `joinRoom()` / `reconnectRoom()` / `leaveRoom()`
- `getSnapshot()` / `subscribeRoom()`
- `setReady()` / `startMatch()` / `resetLobby()`
- `submitAction()` / `publishState()` / `resolveAction()`
- `emitEvent()` / `setPostMatchChoice()`

The existing `WDOnlineBridge` and host battle engine remain authoritative. Supabase validates room membership, the exact state sequence, and the current interaction owner before queuing a guest action. The host executes DiceDuel rules and publishes the next protected state. Set `onlineProvider` back to `firebase` only as an emergency rollback.

## Security model

- Cloud saves can only be read by their owner.
- A user cannot directly insert/update/delete any battle table.
- Room data is readable only after membership is established through the join RPC.
- The host alone may publish authoritative compatibility states or resolve queued actions.
- Guest actions must match the current sequence and `interactionOwnerUid`.
- Save uploads use optimistic revisions; a stale device receives `DD_SAVE_CONFLICT` instead of silently overwriting a newer cloud save.
- Rooms expire on inactivity, not on a fixed lifetime: 45 minutes idle in the lobby, 2 hours idle during a running match. Every join, ready, guest action and published state pushes the deadline back, so a live match is never cleaned up underneath the players. Expired rooms are opportunistically cascade-deleted when the next room is created.
- The room row is only rewritten when the deadline is more than five minutes stale, so refreshing it does not add a Realtime message per move.
- The authoritative match state lives in `dd_battle_states` only. `dd_battle_rooms.match->state` is not written per move; `dd_get_battle_snapshot` fills it in from `dd_battle_states` when a client asks.

Run `bash scripts/qa/supabase-raumtest.sh` to check these rules against a throwaway PostgreSQL instance. It applies the migrations, asserts the room-expiry and state-write behaviour, and verifies itself by rebuilding the naive variant, which must fail.

## Recommended test order

1. Register, confirm email if enabled, log in, upload, reload, and download on device A.
2. Change the save on device B and verify stale uploads are rejected.
3. Create a room with an anonymous session and join it from a second browser.
4. Verify a non-member cannot select any room table rows.
5. Verify a guest cannot start a room, publish state, or act for another user.
6. Reload one device during a running match and verify it restores the latest state.
7. Verify a stale `baseSeq` is rejected by `dd_submit_battle_action`.
