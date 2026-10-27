# Family Tree: shared network setup (about 15 minutes)

The app runs in two modes:
- **No Supabase keys** -> single-device version (data in the browser only).
- **With Supabase keys** -> shared, invite-only family network (this guide).

> Already running an older `schema.sql`? Do **not** re-run the whole file. In the SQL Editor run, in order:
> 1. `supabase/migration_002_delete_account.sql` (only if you have not run it yet)
> 2. `supabase/migration_003_hardening.sql` (concurrent-edit protection, cascade rules, atomic writes)
>
> Both are written to be safe on a database that already holds real data. Fresh installs only need `schema.sql`, which already includes everything.

## 1. Create the database (free)
1. Go to https://supabase.com -> New project (any name, pick a region close to your relatives, save the database password).
2. Open **SQL Editor -> New query**, paste the whole of `supabase/schema.sql`, press **Run**. It must finish with "Success".
3. **Project Settings -> API**: copy the Project URL and the `anon public` key.

## 2. Connect the app
1. Copy `.env.example` to `.env.local` and paste the two values.
2. `npm install` then `npm run dev` -> http://localhost:3000

## 3. Authentication settings (Supabase -> Authentication)
- **Providers -> Email**: keep enabled. Leave "Confirm email" ON for production.
- **URL Configuration**: set **Site URL** to your live address (e.g. https://your-app.vercel.app). Invite links use the address the app is opened from.
  Also add both redirects under **Redirect URLs**: `https://your-app.vercel.app/join` and `https://your-app.vercel.app/reset`. Supabase ignores targets that are not listed, which silently breaks invite links and password resets.
- **SMTP Settings**: set up custom SMTP (you already have Zoho). Supabase's built-in email sender allows only a few emails per hour, so sign-ups will stall without this.

## 4. Deploy (Vercel)
Import the project, add the same two environment variables, deploy. Add the Vercel URL to Supabase **Site URL**.

## 5. Use it
1. Sign up -> "Create tree" -> "Add myself".
2. Add parents, partners, children (use the dropdowns to link them).
3. Open a relative's card -> **Invite link** -> send it (WhatsApp etc.). One link = one card, one use, valid 14 days.
4. The relative signs up, claims the card, adds their own family and invites the next people.

## Rules (enforced by the database)
- Only signed-in members can read the tree.
- A card can be edited only by the account that created it, or the person who claimed it (that person can edit their own card but not delete it).
- Only the creator can delete a card. The founder cannot edit or delete anyone's entry.
- Any member can flag an entry. The founder can **hide** it (reversible) or dismiss the flag.
- Members can delete their own account in the app (Network tab). A founder must first transfer the tree to another member or delete the whole tree.
- Invites cannot be reused; creating a new invite for a card cancels the previous one.

## Before you sell this
- Add a privacy policy and terms page (you store personal data of living people; Eswatini's Data Protection Act and, for relatives in Europe, GDPR apply).
- Photos are stored inside the database (shrunk to ~256px). For many photos, move them to Supabase Storage.
- Free plan: the project pauses after a week without activity. Upgrade before real customers use it.
