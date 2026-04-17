# TryGC KSA Dashboard

Static dashboard with Supabase Auth and role-based feature access.

## Supabase setup

1. Create a Supabase project.
2. Enable Email/Password auth in Authentication > Providers.
3. Create users in Authentication > Users.
4. Set each user's role in user metadata:

```json
{
  "role": "admin"
}
```

Supported roles are `admin`, `manager`, `sales`, and `finance`.

## Demo users

```txt
admin.demo@try-gc.com      Demo@12345
manager.demo@try-gc.com    Demo@12345
sales.demo@try-gc.com      Demo@12345
finance.demo@try-gc.com    Demo@12345
```

These accounts use Supabase user metadata roles and can be selected from the sign-in screen.

## Vercel environment variables

Set these variables in the Vercel project:

```txt
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

The build writes those values into `dist/config.js`.

## Local build

```bash
npm run build
```

Open `dist/index.html` through a local static server.
