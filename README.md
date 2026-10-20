This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Order push notifications

Order push notifications use the free Web Push protocol. Generate a VAPID key pair with:

```bash
npx web-push generate-vapid-keys
```

Set the generated values in your local and deployment environments:

```text
WEB_PUSH_VAPID_PUBLIC_KEY=<public key>
WEB_PUSH_VAPID_PRIVATE_KEY=<private key>
WEB_PUSH_VAPID_SUBJECT=mailto:<your-support-email>
```

Keep the private key secret. Apply the subscription-table migration before deploying:

```bash
npx prisma migrate deploy
```

Customers can enable or disable order notifications from their Profile page. Push delivery is available over HTTPS; on iPhone and iPad, the PWA must be added to the Home Screen first.

## Customer OTP via Wakit (WhatsApp)

Customer registration and login OTPs are delivered over WhatsApp through [Wakit](https://wakit.in/docs). The server reads the API key from a single **server-only** environment variable:

```text
WAKIT_API_KEY=wk_live_xxxxxxxxxxxxxxxxxxxx
```

Configuration rules:

- Set it in `.env.local` for local development and in your deployment environment (for Vercel: Project → Settings → Environment Variables, scope it to Server only). Never prefix it with `NEXT_PUBLIC_`, never put it in client code, and never commit it.
- The key is used as `Authorization: Bearer <key>` server-side only; it is never returned in an API response or written to logs.
- If `WAKIT_API_KEY` is missing, OTP send/verify fails safely with a generic "not configured" error. No other provider is contacted.

Wakit is the only customer OTP provider. There is no SMS fallback; customers without WhatsApp or during a Wakit outage receive a clear, safe error, and no account or session is created until OTP verification succeeds.

Automated tests mock all provider requests (no live OTPs, no credits consumed):

```bash
npm test
```

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
