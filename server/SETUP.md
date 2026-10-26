# Accounts setup

PebbleIDE accounts and shared projects run on Cloudflare. The code is in `server/accounts.js` and `server/projects.js`, and Cloudflare runs it in a Worker that starts in `server/worker.js`. Accounts, bios, profile pictures, upvotes and views are kept in a Cloudflare D1 database. Shared project files and thumbnails go in Cloudflare KV storage. Cloudflare Turnstile is the robot check.

Run these in PowerShell from the `PebbleIDE` folder:

```powershell
cd C:\Users\dylan\Cfold\PebbleIDE
```

## 1. Let Wrangler use your Cloudflare account

Wrangler is Cloudflare's tool for deploying. This opens your browser so you can allow it. You only do this once.

```powershell
npx.cmd wrangler login
```

pebbleide.com is a Cloudflare Worker called `pebble-ide`. If you ever use a different one, change `name` at the top of `wrangler.toml` to match.

## 2. Make the database

```powershell
npx.cmd wrangler d1 create pebbleide-accounts
```

This prints a `database_id`. Put it in `wrangler.toml` in place of the zeros, then make the tables:

```powershell
npm.cmd run db:setup
```

Run `npm.cmd run db:setup` again whenever a new file shows up in `server/migrations`. It only makes the changes that haven't been made yet.

## 3. Make a place for shared projects

Project files and thumbnails go in a KV namespace, which is free and holds 1 GB (about 600 average projects):

```powershell
npx.cmd wrangler kv namespace create pebbleide-projects
```

Put the id it prints in the `[[kv_namespaces]]` part of `wrangler.toml`. (PebbleIDE's is already set up.)

KV allows 1,000 uploads and changes a day on the free plan. When that's not enough, switch to R2, which holds 10 GB for free but needs a payment method on the Cloudflare account. Turn on R2 in the dashboard, then:

```powershell
npx.cmd wrangler r2 bucket create pebbleide-projects
```

Then replace the `[[kv_namespaces]]` part of `wrangler.toml` with this. Projects already shared stay in KV, so move them over first or start fresh.

```toml
[[r2_buckets]]
binding = "PROJECT_FILES"
bucket_name = "pebbleide-projects"
```

## 4. Set up the robot check (Turnstile)

1. In the Cloudflare dashboard, open **Turnstile** and choose **Add widget**.
2. Name it PebbleIDE, add the hostname `pebbleide.com`, and keep the mode on **Managed**.
3. Copy the **site key** into `TURNSTILE_SITE_KEY` in `src/lib/pebble-accounts.js`. It isn't a secret.
4. Save the **secret key** on Cloudflare. Paste it when Wrangler asks:

```powershell
npx.cmd wrangler secret put TURNSTILE_SECRET
```

## 5. Set up emails (for "Verify your email" and "Forgot your password?")

Emails are sent with [Resend](https://resend.com). Its free plan covers 3,000 emails a month.

1. Make a Resend account and add the domain `pebbleide.com`.
2. Add the DNS records Resend shows you to the domain's DNS in Cloudflare, then wait for Resend to say the domain is verified.
3. Make an API key in Resend and save it on Cloudflare:

```powershell
npx.cmd wrangler secret put RESEND_API_KEY
```

Until this is set up, emails aren't sent. They're only written to the log. People need to verify their email before they can share projects, upvote, or change their bio or profile picture, so set this up before you open accounts to everyone.

## 6. Build and put the site online

```powershell
$env:NODE_ENV = "production"; npm.cmd run build:site
npm.cmd run deploy
```

This replaces dragging the `build` folder into Cloudflare, since drag-and-drop uploads can't run the account code. If the site is ever put online without it, the Sign in button, Upload button and project lists hide themselves. To leave them out of a build completely, add `$env:PEBBLE_ACCOUNTS = "false";` before building.

## Giving someone a role

Everyone starts as a Member. Roles are Member, Developer, Moderator and Admin, and they're given out by hand. For example, to make Thenextshb a Developer:

```powershell
npx.cmd wrangler d1 execute pebbleide-accounts --remote --command "UPDATE users SET role = 'developer' WHERE username = 'Thenextshb'"
```

Use `member`, `developer`, `moderator` or `admin`. The new role shows on their profile right away.

## Rules for shared projects

These are set at the top of `server/projects.js`:

- A project gets into **Featured** once it has 25 upvotes.
- **What people want featured** shows a random mix of projects that aren't featured yet. Each upvote gives a project a better chance.
- Owners can change a project once every 10 minutes, and share a new one once a minute.
- Sharing projects and upvoting need a verified email. Saving only needs an account.
- A project file can be up to 20 MB.
- Owners, moderators and admins can delete a project from its page.

## Trying it on your computer

```powershell
npm.cmd run db:setup:local
npm.cmd run start:api
```

Then, in a second PowerShell window, run `npm.cmd start` and open http://localhost:8601. Local sign-ins use Cloudflare's test keys from `.dev.vars`, so the robot check always passes. Verify and reset-password emails show up in the `start:api` window instead of being sent.

## If something goes wrong

- **"Accounts aren't set up on this site yet."** The site key is missing from `src/lib/pebble-accounts.js`.
- **"Something went wrong on our end."** A setting is probably missing. Open the project's **Functions** logs in the Cloudflare dashboard to see which one.
- **Error 1102.** The free Workers plan allows about 10 ms of computer time per request, and checking a password takes more than that. Cloudflare usually allows the extra, but if this error shows up, the $5 Workers plan fixes it.
