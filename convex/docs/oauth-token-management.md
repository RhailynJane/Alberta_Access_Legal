# OAuth Token Management with Convex

## Overview

This document explains how to manage OAuth tokens (specifically Google OAuth) in a Convex application for accessing third-party APIs like Google Calendar, Google Maps, etc. Since Convex Auth handles authentication but not API token storage, we need to implement our own token management system.

## Why This Matters

While Convex Auth provides excellent authentication capabilities, it doesn't store or manage OAuth tokens needed to access third-party APIs on behalf of users. This is important for Access Alberta Legal because:

1. **Google Maps Integration**: We'll need Google Maps API access for location-based features
2. **Google Calendar Integration**: Lawyers and clients may want to sync appointments
3. **Future Microsoft Integration**: Similar pattern for Microsoft Graph API access
4. **Token Refresh**: Properly handling expired tokens ensures uninterrupted service

## How It Works

### The OAuth Flow

1. **User Authorization**: User grants permission to access their Google account with specific scopes
2. **Code Exchange**: We receive an authorization code and exchange it for tokens
3. **Token Storage**: Store access token, refresh token, and expiration in our database
4. **Token Usage**: Use the access token to call Google APIs
5. **Token Refresh**: When expired, use refresh token to get a new access token

### Key Architectural Decisions

- **Separate from Auth**: OAuth tokens are stored separately from Convex Auth tables
- **Action + Mutation Pattern**: Actions handle external API calls, mutations handle database writes
- **Just-in-Time Refresh**: Tokens are refreshed only when needed, not on a schedule
- **Persistent Storage**: Expired tokens are updated, not deleted

## Implementation

### 1. Database Schema

The schema is already defined in `convex/schema.ts`:

```typescript
// OAuth tokens with proper user reference
oauthTokens: defineTable({
  userId: v.id("users"),
  provider: v.union(v.literal("google"), v.literal("microsoft")),
  accessToken: v.string(),
  refreshToken: v.optional(v.string()),
  expiresAt: v.number(),
  scope: v.string(),
})
  .index("by_user_provider", ["userId", "provider"])
  .index("by_userId", ["userId"])
```

### 2. Token Management Mutations

Create `convex/google.ts` to handle token storage:

```typescript
// convex/google.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const upsertToken = mutation({
  args: {
    userId: v.id("users"),
    provider: v.literal("google"),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    expiresAt: v.number(), // milliseconds since epoch
    scope: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if token already exists for this user and provider
    const existing = await ctx.db
      .query("oauthTokens")
      .withIndex("by_user_provider", q =>
        q.eq("userId", args.userId).eq("provider", "google")
      )
      .first();

    if (existing) {
      // Update existing token
      await ctx.db.patch(existing._id, {
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        expiresAt: args.expiresAt,
        scope: args.scope,
      });
      return existing._id;
    }
    
    // Insert new token
    return ctx.db.insert("oauthTokens", args);
  },
});
```

### 3. Code Exchange Action

Exchange authorization code for tokens:

```typescript
// convex/google.ts (continued)
import { action } from "./_generated/server";
import { api } from "./_generated/api";

export const exchangeCodeForToken = action({
  args: {
    code: v.string(),
    redirectUri: v.string(), // Must match the one used in OAuth flow
  },
  handler: async (ctx, args) => {
    // Verify user is authenticated
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not signed in");

    // Get OAuth credentials from environment
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error("Missing Google OAuth environment variables");
    }

    // Exchange code for tokens using Google's token endpoint
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: args.code,
      grant_type: "authorization_code",
      redirect_uri: args.redirectUri,
    });

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    
    if (!response.ok) {
      throw new Error("Failed to exchange authorization code");
    }
    
    const data = await response.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in: number; // seconds
      scope: string;
      token_type: string;
    };

    // Calculate expiration timestamp
    const expiresAt = Date.now() + data.expires_in * 1000;
    
    // Store tokens in database (actions can't use ctx.db directly)
    await ctx.runMutation(api.google.upsertToken, {
      userId: identity.subject as any, // User ID from auth
      provider: "google",
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt,
      scope: data.scope ?? "",
    });

    return { ok: true };
  },
});
```

### 4. Using Tokens with Auto-Refresh

Call Google APIs with automatic token refresh:

```typescript
// convex/google.ts (continued)
export const callGoogleApi = action({
  args: {},
  handler: async (ctx) => {
    // Verify user is authenticated
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not signed in");

    // Load user's Google token
    const tokenDoc = await ctx.db
      .query("oauthTokens")
      .withIndex("by_user_provider", q =>
        q.eq("userId", identity.subject as any).eq("provider", "google")
      )
      .first();
    
    if (!tokenDoc) {
      throw new Error("No Google token on file. Please connect your Google account.");
    }

    let { accessToken, refreshToken, expiresAt, scope } = tokenDoc;

    // Check if token is expired and refresh if needed
    if (Date.now() >= expiresAt && refreshToken) {
      const clientId = process.env.GOOGLE_CLIENT_ID!;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
      
      const body = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      });
      
      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      
      if (response.ok) {
        const data = await response.json() as {
          access_token: string;
          expires_in: number;
          scope?: string;
        };
        
        // Update token values
        accessToken = data.access_token;
        expiresAt = Date.now() + data.expires_in * 1000;
        scope = data.scope ?? scope;

        // Store refreshed token
        await ctx.runMutation(api.google.upsertToken, {
          userId: tokenDoc.userId,
          provider: "google",
          accessToken,
          refreshToken, // Keep existing refresh token
          expiresAt,
          scope,
        });
      } else {
        throw new Error("Failed to refresh token. User may need to re-authenticate.");
      }
    }

    // Example: Call Google Calendar API
    const calendarResponse = await fetch(
      "https://www.googleapis.com/calendar/v3/users/me/calendarList",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    
    if (!calendarResponse.ok) {
      throw new Error("Google API call failed");
    }
    
    return await calendarResponse.json();
  },
});
```

## Frontend Integration

### Initiating OAuth Flow

```javascript
// app/settings/integrations/page.js
const connectGoogle = () => {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const redirectUri = `${window.location.origin}/api/auth/google/callback`;
  
  // Request appropriate scopes for your needs
  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/userinfo.email',
    // Add more scopes as needed
  ].join(' ');
  
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('access_type', 'offline'); // Request refresh token
  authUrl.searchParams.set('prompt', 'consent'); // Force consent to get refresh token
  
  window.location.href = authUrl.toString();
};
```

### Handling OAuth Callback

```javascript
// app/api/auth/google/callback/route.js
import { api } from "@/convex/_generated/api";
import { fetchAction } from "convex/nextjs";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  
  if (error) {
    return Response.redirect('/settings/integrations?error=auth_declined');
  }
  
  if (!code) {
    return Response.redirect('/settings/integrations?error=no_code');
  }
  
  try {
    // Exchange code for tokens
    await fetchAction(api.google.exchangeCodeForToken, {
      code,
      redirectUri: `${process.env.NEXT_PUBLIC_URL}/api/auth/google/callback`,
    });
    
    return Response.redirect('/settings/integrations?success=google_connected');
  } catch (error) {
    console.error('Failed to exchange code:', error);
    return Response.redirect('/settings/integrations?error=exchange_failed');
  }
}
```

## Best Practices

### 1. Token Security
- Never expose tokens to the frontend
- Always validate user identity before token operations
- Use HTTPS for all OAuth flows

### 2. Refresh Strategy
- Refresh tokens just-in-time, not on a schedule
- Keep refresh tokens secure and never expose them
- Handle refresh failures gracefully

### 3. Scope Management
- Request minimal scopes needed
- Separate authentication from API access scopes
- Document required scopes for each feature

### 4. Error Handling
- Gracefully handle expired tokens
- Provide clear user feedback when re-authentication is needed
- Log token refresh failures for monitoring

### 5. Token Lifecycle
- Don't delete expired tokens - update them
- Only delete tokens when user explicitly disconnects
- Track token usage for audit purposes

## Environment Variables

Required environment variables:

```bash
# Google OAuth credentials
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# Public environment variables (for frontend)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
NEXT_PUBLIC_URL=http://localhost:3000  # or your production URL
```

## Future Considerations

### Microsoft Integration
The same pattern can be applied for Microsoft Graph API:
- Change provider to "microsoft"
- Use Microsoft's OAuth endpoints
- Adjust scopes for Microsoft services

### Additional Google Services
For Google Maps API:
- May not require user OAuth (can use API key)
- Consider service account for server-side operations
- Store API keys securely in environment variables

### Token Monitoring
Consider implementing:
- Token usage analytics
- Refresh failure alerts
- Automatic cleanup of disconnected accounts
- Rate limit tracking

## Troubleshooting

### Common Issues

1. **Missing Refresh Token**
   - Ensure `access_type=offline` in OAuth URL
   - Use `prompt=consent` to force consent screen
   - Some providers only send refresh token on first authorization

2. **Token Refresh Fails**
   - Check if refresh token is still valid
   - User may have revoked access
   - Credentials may have changed

3. **API Calls Fail**
   - Verify token has required scopes
   - Check if token is expired
   - Ensure proper Authorization header format

4. **Database Errors**
   - Verify indexes are properly set up
   - Check user ID references are valid
   - Ensure provider enum matches schema

## References

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Convex Auth Documentation](https://labs.convex.dev/auth)
- [Convex Actions Documentation](https://docs.convex.dev/functions/actions)
- [Using Cursor with Convex Example](https://stack.convex.dev/using-cursor-claude-and-convex-to-build-a-social-media-scheduling-app)