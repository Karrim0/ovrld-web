# Gym Crew Production Authentication Checklist

The code now generates correct callback URLs, but Supabase must also allow those URLs and email/password signup must be enabled.

## 1. Vercel environment variables

Add these to both **Production** and **Preview** environments:

```env
NEXT_PUBLIC_SUPABASE_URL=https://mbzbjmqxknkjvrnoibvt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your Supabase publishable/anon key>
NEXT_PUBLIC_APP_URL=https://gym-crew-one.vercel.app
```

After adding or changing environment variables, create a new deployment/redeploy. Existing deployments do not receive newly added values.

Never use the Supabase service-role key in the browser.

## 2. Supabase Auth URL Configuration

Open:

`Supabase Dashboard -> Authentication -> URL Configuration`

Set **Site URL** to:

```text
https://gym-crew-one.vercel.app
```

Add these **Redirect URLs**:

```text
https://gym-crew-one.vercel.app/auth/callback
http://localhost:3000/auth/callback
```

For a Vercel Preview deployment, also add its exact callback URL, for example:

```text
https://your-preview-domain.vercel.app/auth/callback
```

Avoid leaving `http://localhost:3000` as the production Site URL.

## 3. Enable new registrations

Open:

`Supabase Dashboard -> Authentication -> Providers -> Email`

Confirm that:

- Email provider is enabled.
- New user signup is allowed.
- Email confirmation is configured according to the desired product behavior.

If email confirmation is enabled, a new user should see the Gym Crew confirmation screen and receive an email. After opening the link, the user should return to `/onboarding` on the deployed domain.

## 4. Email templates

Open:

`Supabase Dashboard -> Authentication -> Email Templates`

Use the Supabase-provided confirmation/recovery URL variables in the templates. Do not hardcode localhost in template links.

## 5. Required production tests

Use a completely new email address and test:

1. Create account.
2. See the confirmation screen.
3. Receive the confirmation email.
4. Open the email link.
5. Return to the deployed Gym Crew URL, not localhost.
6. Finish onboarding.
7. Log out and log back in.
8. Request password reset.
9. Open the recovery email.
10. Return to `/update-password` on the deployed URL.
11. Save a new password and log in with it.
12. Try registering the same email again and confirm a clear message is displayed.

## 6. Common failure meanings

- **Email link opens localhost**: Supabase Site URL/template or the deployment environment was not updated.
- **Vercel shows missing environment variable**: variables are absent from the selected Vercel environment, or the deployment was not rebuilt.
- **Register button appears to do nothing**: inspect the visible form message and Supabase Auth logs; signup may be disabled, rate-limited, or the email may already exist.
- **Confirmation link expired**: use the resend confirmation action on the Gym Crew registration success screen.
