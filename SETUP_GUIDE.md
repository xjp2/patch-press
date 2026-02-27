# Patch & Press - Setup Guide

This guide will walk you through setting up Supabase Authentication and Stripe Payments for your Patch & Press app.

---

## Table of Contents

1. [Supabase Setup](#supabase-setup)
   - [Create Supabase Project](#create-supabase-project)
   - [Configure Environment Variables](#configure-environment-variables)
   - [Enable Apple Sign In](#enable-apple-sign-in)
   - [Database Setup (Optional)](#database-setup-optional)

2. [Stripe Setup](#stripe-setup)
   - [Create Stripe Account](#create-stripe-account)
   - [Get API Keys](#get-api-keys)
   - [Create Payment Intent Edge Function](#create-payment-intent-edge-function)
   - [Configure Webhooks](#configure-webhooks)

3. [Environment Variables](#environment-variables)

4. [Testing](#testing)

---

## Supabase Setup

### Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Enter your project details:
   - **Name**: `patch-press` (or your preferred name)
   - **Database Password**: Create a strong password
   - **Region**: Choose the closest region to your users
4. Click "Create new project"
5. Wait for the project to be created (this may take a few minutes)

### Configure Environment Variables

1. In your Supabase dashboard, go to **Project Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://your-project.supabase.co`)
   - **anon/public** API key (starts with `eyJ...`)

3. Create a `.env` file in your project root:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### Enable Apple Sign In

1. In Supabase dashboard, go to **Authentication** → **Providers**
2. Find **Apple** in the list and click it
3. Toggle **Enabled** to ON
4. You'll need to configure Apple Developer credentials:

#### Apple Developer Setup

1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Sign in with your Apple ID
3. Go to **Certificates, Identifiers & Profiles**
4. Create an **App ID** for your web app:
   - Select **App IDs**
   - Click the **+** button
   - Select **App** as the type
   - Enter a description (e.g., "Patch & Press")
   - Set Bundle ID (e.g., `com.yourcompany.patchpress`)
   - Enable **Sign In with Apple** capability
   - Click **Continue** then **Register**

5. Create a **Services ID**:
   - Go to **Identifiers**
   - Click the **+** button
   - Select **Services IDs**
   - Enter a description
   - Set Identifier (e.g., `com.yourcompany.patchpress.web`)
   - Enable **Sign In with Apple**
   - Click **Configure**:
     - Primary App ID: Select your App ID
     - Domains: Add your domain (e.g., `patchpress.com`)
     - Return URLs: Add `https://your-project.supabase.co/auth/v1/callback`
   - Click **Save**, **Continue**, then **Register**

6. Create a **Key** for Sign In with Apple:
   - Go to **Keys**
   - Click the **+** button
   - Enter a key name
   - Enable **Sign In with Apple**
   - Click **Configure** and select your Primary App ID
   - Click **Save**, **Continue**, then **Register**
   - **Download the key file** (you can only do this once!)
   - Note the **Key ID**

7. Get your **Team ID**:
   - Go to [Apple Developer Membership](https://developer.apple.com/account/#!/membership)
   - Copy your **Team ID**

8. Back in Supabase Apple provider settings, enter:
   - **Services ID**: Your Services ID (e.g., `com.yourcompany.patchpress.web`)
   - **Key ID**: Your Key ID from step 6
   - **Team ID**: Your Team ID from step 7
   - **Private Key**: Open the downloaded `.p8` file and paste the contents

9. Click **Save**

### Database Setup (Optional)

If you want to store user data, orders, etc., create these tables:

```sql
-- Users table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  primary key (id)
);

-- Orders table
create table public.orders (
  id uuid default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  items jsonb not null,
  total_amount integer not null,
  status text default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now()),
  primary key (id)
);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.orders enable row level security;

-- Create policies
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can view own orders" on public.orders
  for select using (auth.uid() = user_id);

create policy "Users can create orders" on public.orders
  for insert with check (auth.uid() = user_id);
```

---

## Stripe Setup

### Create Stripe Account

1. Go to [https://stripe.com](https://stripe.com) and sign up
2. Complete your account setup
3. Switch to **Test mode** (toggle in the top right)

### Get API Keys

1. In Stripe Dashboard, go to **Developers** → **API keys**
2. Copy the following **Test mode** keys:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (starts with `sk_test_`)

3. Add to your `.env` file:

```bash
# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_SECRET_KEY=sk_test_your_key_here
```

### Create Payment Intent Edge Function

1. In Supabase dashboard, go to **Edge Functions**
2. Click **New Function**
3. Name it `create-payment-intent`
4. Paste this code:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  httpClient: Stripe.createFetchHttpClient(),
})

serve(async (req) => {
  try {
    const { amount, currency = 'usd' } = await req.json()

    // Create a PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount, // Amount in cents
      currency,
      automatic_payment_methods: { enabled: true },
    })

    return new Response(
      JSON.stringify({ clientSecret: paymentIntent.client_secret }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
```

5. Click **Deploy**

6. Add your Stripe Secret Key to Supabase Secrets:
   - Go to **Project Settings** → **Edge Functions**
   - Click **Add Secret**
   - Name: `STRIPE_SECRET_KEY`
   - Value: Your Stripe Secret Key (`sk_test_...`)
   - Click **Add**

### Configure Webhooks (Optional but Recommended)

Webhooks notify your app when payment events occur.

1. In Stripe Dashboard, go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter your endpoint URL: `https://your-project.supabase.co/functions/v1/stripe-webhook`
4. Select events to listen for:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
5. Click **Add endpoint**
6. Copy the **Signing secret** (starts with `whsec_`)
7. Add it to Supabase Secrets:
   - Name: `STRIPE_WEBHOOK_SECRET`
   - Value: Your webhook signing secret

---

## Environment Variables

Your final `.env` file should look like this:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**Important:**
- Never commit `.env` to git - add it to `.gitignore`
- Use different keys for production (they start with `pk_live_` and `sk_live_`)

---

## Testing

### Test Authentication

1. Start your app: `npm run dev`
2. Click the user icon in the navbar
3. Try signing up with email/password
4. Check your email for verification link
5. Try signing in
6. Test Apple Sign In (requires Apple Developer account)

### Test Cart

1. Go to the Design Tool
2. Select a product
3. Add some patches
4. Click "Add to Cart"
5. Click the cart icon in the navbar
6. Verify items appear in cart
7. Test quantity updates and remove functionality

### Test Stripe Payments

Use these test card numbers:

| Card Number | Scenario |
|-------------|----------|
| `4242 4242 4242 4242` | Payment succeeds |
| `4000 0000 0000 9995` | Payment declined |
| `4000 0025 0000 3155` | Requires 3D Secure |

- Use any future date for expiry
- Use any 3 digits for CVC
- Use any ZIP code

---

## Going Live

### Supabase

1. Your Supabase project is already live
2. Just update your environment variables in your hosting platform

### Stripe

1. In Stripe Dashboard, switch to **Live mode**
2. Get your **Live** API keys
3. Update your environment variables:
   - `VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...`
   - `STRIPE_SECRET_KEY=sk_live_...`
4. Update the Stripe Secret Key in Supabase Secrets
5. Create a new webhook endpoint for production

### Apple Sign In

1. In Apple Developer Portal, create production credentials
2. Update Supabase Apple provider settings with production values

---

## Troubleshooting

### Apple Sign In Not Working

- Verify all Apple credentials are correct
- Check that the Return URL in Apple matches exactly
- Ensure your domain is verified in Apple Developer

### Stripe Payment Failing

- Check browser console for errors
- Verify Stripe Publishable Key is correct
- Check Supabase Edge Function logs
- Ensure you're using Test mode keys for testing

### Cart Not Persisting

- Cart uses localStorage - check browser dev tools → Application → Local Storage
- Clear site data and try again

---

## Need Help?

- **Supabase Docs**: https://supabase.com/docs
- **Stripe Docs**: https://stripe.com/docs
- **Apple Sign In Docs**: https://developer.apple.com/sign-in-with-apple/
