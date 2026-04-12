# Vercel Deployment Guide - Islamic Kids Learning Platform

## Prerequisites

1. **Supabase Account & Project**
   - Create a Supabase project at [supabase.com](https://supabase.com)
   - Get your project URL and anon key from the Supabase dashboard

2. **Vercel Account**
   - Sign up at [vercel.com](https://vercel.com)
   - Install Vercel CLI: `npm i -g vercel`

## Step 1: Environment Variables Setup

### Required Environment Variables

Add these to your Vercel project settings:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Optional Environment Variables

```bash
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key  # For admin operations
RESEND_API_KEY=your_resend_api_key                      # For email functionality
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app         # Your deployed app URL
```

## Step 2: Supabase Configuration

### Database Tables

Ensure these tables exist in your Supabase project:

1. **users** table - Stores user profiles
2. **users_points** table - Stores user points and progress
3. **stories** table - Stores Islamic stories
4. **quizzes** table - Stores quiz questions

### Row Level Security (RLS) Policies

Enable RLS on all tables and create appropriate policies:

```sql
-- Example RLS policy for users table
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = uid);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = uid);
```

## Step 3: Vercel Deployment

### Method 1: GitHub Integration (Recommended)

1. Push your code to GitHub
2. Connect your GitHub repository to Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy automatically on push

### Method 2: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod

# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
```

## Step 4: Mobile Authentication Fixes

### Key Issues Addressed

1. **Storage Restrictions**
   - WebView localStorage limitations
   - Private/incognito mode restrictions
   - Cookie blocking in mobile browsers

2. **Network Issues**
   - Mobile data vs WiFi switching
   - Connection timeouts
   - CORS issues on mobile

3. **Session Persistence**
   - Token storage in mobile browsers
   - Session refresh on mobile
   - Background app state handling

### Mobile-Specific Optimizations

1. **Enhanced Error Handling**
   - Device-specific error messages
   - Storage availability detection
   - WebView detection and handling

2. **Responsive Design**
   - Touch-friendly interfaces
   - Optimized for small screens
   - Better loading states

3. **Performance**
   - Reduced bundle size
   - Optimized images for mobile
   - Faster initial load times

## Step 5: Testing Mobile Authentication

### Test Scenarios

1. **iOS Safari**
   - Normal browsing mode
   - Private browsing mode
   - Low power mode

2. **Android Chrome**
   - Normal browsing
   - Incognito mode
   - Data saver mode

3. **WebView Apps**
   - In-app browsers
   - Social media WebViews
   - Custom WebView implementations

### Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Session not persisted" | Enable cookies/localStorage |
| "Storage unavailable" | Use alternative storage fallback |
| "Network error" | Check CORS settings, retry logic |
| "Auth state lost" | Implement session recovery |

## Step 6: Monitoring & Debugging

### Enable Debug Mode

Add `?debug=true` to your URL to enable debug information:
- Device info display
- Storage availability status
- Network request logging
- Authentication state tracking

### Vercel Logs

Check Vercel function logs for:
- Authentication errors
- Database connection issues
- Mobile-specific errors
- Performance bottlenecks

### Supabase Logs

Monitor Supabase dashboard for:
- Authentication events
- Database query performance
- Rate limiting issues
- Security events

## Troubleshooting

### Sign-In Issues

1. **Check Environment Variables**
   ```bash
   vercel env ls
   ```

2. **Verify Supabase Connection**
   - Test database connectivity
   - Check RLS policies
   - Verify user permissions

3. **Mobile-Specific Issues**
   - Test in different browsers
   - Check storage restrictions
   - Verify network connectivity

### Performance Issues

1. **Bundle Size**
   - Use dynamic imports for heavy components
   - Optimize images with Next.js Image component
   - Enable compression in Vercel settings

2. **Database Queries**
   - Add proper indexes
   - Use pagination for large datasets
   - Implement caching where appropriate

## Security Considerations

1. **HTTPS Only**
   - All authentication must use HTTPS
   - Secure cookie settings
   - CSRF protection

2. **Rate Limiting**
   - Implement rate limiting for auth endpoints
   - Monitor for suspicious activity
   - Use Supabase's built-in rate limiting

3. **Data Protection**
   - Encrypt sensitive data
   - Use RLS policies
   - Regular security audits

## Support

For issues with:
- **Authentication**: Check mobile auth helper logs
- **Database**: Review Supabase logs and RLS policies
- **Deployment**: Check Vercel build logs
- **Mobile**: Enable debug mode for detailed diagnostics

## Next Steps

1. Set up monitoring (Sentry, LogRocket)
2. Implement analytics
3. Add push notifications
4. Create mobile app wrapper (optional)
5. Implement offline functionality