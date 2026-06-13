# Backend — Leaderboard (Supabase)

The game stores a **top-10 leaderboard per category**, ranked by **fewest moves**
(a "move" = placing a piece; repositioning a placed piece counts as another move).
Each entry has a **name** and an optional **message**.

There is no server to run — the static page talks directly to Supabase's REST API.
The work happens in the browser; Supabase stores the rows.

## Setup (one time, ~3 minutes)

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste the contents of
   [supabase/schema.sql](supabase/schema.sql), and click **Run**.
   This creates the `leaderboard` table, an index, and Row-Level-Security policies
   (public can read + insert; nobody can update or delete via the public key).
3. Open **Project Settings → API** and copy:
   - **Project URL** (e.g. `https://abcdefgh.supabase.co`)
   - **anon / public** key
4. Paste both into the config block at the top of [index.html](index.html):
   ```html
   <script>
   window.SUPABASE_URL = 'https://abcdefgh.supabase.co';
   window.SUPABASE_ANON_KEY = 'eyJhbGciOi...';   // the anon public key
   </script>
   ```
5. Redeploy (re-drag the folder to Netlify, or push and let it auto-deploy).

That's it. On a win, players see their move count, can submit name + message,
and the category's top 10 appears.

## Is the anon key safe to commit?

Yes. The **anon key is designed to be public** and shipped in frontend code.
What protects your data is **Row-Level Security** (set up by the SQL above):

- ✅ anyone can read the leaderboard
- ✅ anyone can insert a score (it's a public arcade board)
- ❌ nobody can edit or delete rows with the anon key

If the board ever gets spammed, you can delete rows from the Supabase
**Table Editor**, or tighten the insert policy / add rate limiting later.

## Graceful fallback

If `SUPABASE_URL` / `SUPABASE_ANON_KEY` are left blank, the game still works fully —
the win screen just shows the move count and hides the submit form / leaderboard.

## Data model

| column      | type        | notes                                  |
|-------------|-------------|----------------------------------------|
| id          | uuid        | primary key                            |
| created_at  | timestamptz | auto                                   |
| category    | text        | `animals` / `food` / … (board grouping)|
| shape       | text        | e.g. `Cat`                             |
| level       | int         | 0-9                                    |
| difficulty  | int         | 0 easy / 1 medium / 2 hard             |
| mode        | text        | `category` / `quick`                   |
| moves       | int         | the score — lower is better            |
| name        | text        | 1-24 chars                             |
| message     | text        | up to 80 chars, optional               |
