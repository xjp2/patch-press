# Deployment Guide for Patch & Press

## Vercel Deployment

### 1. Prerequisites
- Vercel account (sign up at https://vercel.com)
- Your Supabase project URL and anon key
- Your Stripe publishable key (for payments)

### 2. Environment Variables
Set these in your Vercel project settings:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### 3. Deploy Steps

#### Option A: Deploy via Vercel CLI
```bash
npm i -g vercel
vercel
```

#### Option B: Deploy via Git
1. Push your code to GitHub
2. Import project in Vercel dashboard
3. Set environment variables
4. Deploy

### 4. Post-Deployment Checklist
- [ ] Verify Supabase connection
- [ ] Test authentication flow
- [ ] Test CMS saving
- [ ] Test checkout flow (use Stripe test cards)

## Performance Optimizations Applied

### Auth Persistence
- Added `isAuthLoading` state to prevent UI flash during session recovery
- Shows loading spinner while auth initializes
- Session is properly persisted across page refreshes

### CMS Performance
- **Batch saves**: Products and patches are now saved in single requests instead of individual calls
- **Parallel deletes**: Removed items are deleted in parallel
- **Debounced auto-save**: Changes are automatically saved after 2 seconds of inactivity
- **Unsaved changes warning**: Browser warns before closing with unsaved changes

### Data Fetching
- **Global cache**: Implemented 5-minute cache for products, patches, and site content
- **Stale-while-revalidate**: Shows cached data immediately while fetching updates
- **Request deduplication**: Prevents duplicate requests within 1 second
- **Loading states**: Global loading overlay during initial data fetch

## Security Headers
The following security headers are configured in `vercel.json`:
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin

## Known Limitations
1. **Stripe Integration**: Currently using test token. For production, integrate Stripe Elements for secure card input.
2. **Image Uploads**: Ensure Supabase storage bucket has proper CORS settings for your Vercel domain.
3. **Edge Functions**: The `create-payment-intent` edge function must be deployed to Supabase.

## Troubleshooting

### Admin button not showing after refresh
- Check browser console for auth errors
- Verify Supabase anon key is correct
- Check that `profiles` table has proper RLS policies

### CMS saving is slow
- Optimizations have been applied (batch saves, parallel operations)
- Check Supabase dashboard for query performance
- Consider upgrading Supabase plan for better performance

### Images not loading
- Verify Supabase storage bucket is public
- Check CORS settings in Supabase storage
- Ensure image URLs are correct in database
