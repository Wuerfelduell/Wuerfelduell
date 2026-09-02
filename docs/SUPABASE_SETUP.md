# DiceDuel Supabase foundation

This release prepares one Supabase project for both DiceDuel accounts/cloud saves and online battles. Local storage remains the offline cache. Firebase remains the active battle transport until the final cutover, so an unfinished Supabase setup cannot break live matches.

The already-created `Profiles` table is intentionally preserved. The foundation does not rename, drop, or rewrite it: its visible `id`, `username`, and `level` fields can remain the public game-profile layer. `dd_accounts` is a private Auth mirror and `dd_account_saves` stores the full protected save. Mapping `Profiles.id` to `auth.users.id` and its exact RLS policies should be done only after the complete `Profiles` schema is confirmed.

## What is already implemented

- Supabase Auth adapter for email/password accounts.
- One revision-protected JSON save per authenticated user.
- PostgreSQL tables for rooms, members, match state, queued actions, visual events, and post-match choices.
- RLS on every public table. Clients receive `SELECT` only; mutations go through validated RPC functions.
- Six-character private room codes and atomic create/join/ready/start/leave functions.
- Sequence and interaction-owner validation before an online action is queued.
- JWT-checked `battle-action` Edge Function.
- Realtime subscription adapter that refreshes one authorized room snapshot.
- Anonymous Supabase identities prepared for players who want to play online without creating an email account.
- Browser and Edge Function clients pinned to `@supabase/supabase-js` 2.114.0.

## 1. Create and link the project

Choose a European Supabase region. With the Supabase CLI installed:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase functions deploy battle-action --no-verify-jwt
```

The function uses `--no-verify-jwt` because it validates the bearer token itself with `auth.getUser()` before calling the protected database RPC. It never uses a service-role key.

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
  onlineProvider:"firebase",
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
- `createRoom()` / `joinRoom()` / `leaveRoom()`
- `getSnapshot()` / `subscribeRoom()`
- `setReady()` / `startMatch()` / `resetLobby()`
- `submitAction()` / `publishState()` / `resolveAction()`
- `emitEvent()` / `setPostMatchChoice()`

The existing `WDOnlineBridge` and host battle engine are unchanged. The next backend phase connects the current lobby controller to this adapter and then moves rule resolution from the host device into the Edge Function. Until that cutover is tested on two devices, `onlineProvider` must stay `firebase`.

## Security model

- Cloud saves can only be read by their owner.
- A user cannot directly insert/update/delete any battle table.
- Room data is readable only after membership is established through the join RPC.
- The host alone may publish authoritative compatibility states or resolve queued actions.
- Guest actions must match the current sequence and `interactionOwnerUid`.
- Save uploads use optimistic revisions; a stale device receives `DD_SAVE_CONFLICT` instead of silently overwriting a newer cloud save.
- Rooms become unjoinable after six hours; expired rooms are opportunistically cascade-deleted when the next room is created.

## Recommended test order

1. Register, confirm email if enabled, log in, upload, reload, and download on device A.
2. Change the save on device B and verify stale uploads are rejected.
3. Create a room with an anonymous session and join it from a second browser.
4. Verify a non-member cannot select any room table rows.
5. Verify a guest cannot start a room, publish state, or act for another user.
6. Verify a stale `baseSeq` returns HTTP 409 from `battle-action`.
