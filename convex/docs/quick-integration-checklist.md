# Quick Integration Checklist for Frontend Developers

## 🚀 5-Minute Setup

### Step 1: Environment Setup
- [ ] Get the Convex deployment URL from backend team
- [ ] Add to `.env.local`:
  ```env
  NEXT_PUBLIC_CONVEX_URL=your-convex-url-here
  ```

### Step 2: Install Dependencies
```bash
npm install convex @convex-dev/auth
```

### Step 3: Wrap Your App
```jsx
// app/layout.js
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { ConvexClientProvider } from "./ConvexClientProvider";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ConvexAuthNextjsServerProvider>
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </ConvexAuthNextjsServerProvider>
      </body>
    </html>
  );
}
```

### Step 4: Create ConvexClientProvider
```jsx
// app/ConvexClientProvider.jsx
"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL);

export function ConvexClientProvider({ children }) {
  return (
    <ConvexProvider client={convex}>
      <ConvexAuthProvider client={convex}>
        {children}
      </ConvexAuthProvider>
    </ConvexProvider>
  );
}
```

### Step 5: Add Authentication UI
```jsx
// components/AuthButton.jsx
"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { Authenticated, Unauthenticated } from "convex/react";

export function AuthButton() {
  const { signIn, signOut } = useAuthActions();
  
  return (
    <>
      <Unauthenticated>
        <button onClick={() => void signIn("github")}>
          Sign In
        </button>
      </Unauthenticated>
      <Authenticated>
        <button onClick={() => void signOut()}>
          Sign Out
        </button>
      </Authenticated>
    </>
  );
}
```

---

## ✅ Complete Integration Checklist

### Foundation
- [ ] Convex URL configured in `.env.local`
- [ ] Dependencies installed (`convex`, `@convex-dev/auth`)
- [ ] ConvexAuthProvider wrapping the app
- [ ] ConvexClientProvider configured

### Authentication Features
- [ ] Sign in with GitHub
- [ ] Sign in with Google  
- [ ] Sign in with Email/Password
- [ ] Sign out functionality
- [ ] Loading states during auth
- [ ] Error handling for failed auth

### User Management
- [ ] Display current user info
- [ ] User role detection (client/lawyer/admin)
- [ ] Profile update functionality
- [ ] User preferences/settings

### Access Control
- [ ] Protected routes implemented
- [ ] Role-based navigation
- [ ] Permission-based UI elements
- [ ] Unauthorized access handling

### Lawyer-Specific Features
- [ ] Lawyer dashboard access
- [ ] Client management interface
- [ ] Appointment calendar
- [ ] Case management system
- [ ] Practice area selection

### Client-Specific Features
- [ ] Client dashboard
- [ ] Appointment booking
- [ ] Message system
- [ ] Document upload
- [ ] Case tracking

### Admin Features
- [ ] Admin panel access
- [ ] User management interface
- [ ] Content moderation tools
- [ ] Analytics dashboard
- [ ] System configuration

---

## 🧪 Testing Checklist

### Authentication Flow
- [ ] Can sign in with OAuth providers
- [ ] Can sign in with email/password
- [ ] Can sign out successfully
- [ ] Session persists on page refresh
- [ ] Handles expired sessions

### Role-Based Access
- [ ] Clients can't access lawyer features
- [ ] Lawyers can't access admin features
- [ ] Admins have full access
- [ ] Proper redirects for unauthorized access

### Error Scenarios
- [ ] Invalid credentials show error
- [ ] Network errors handled gracefully
- [ ] Loading states display correctly
- [ ] Fallback UI for auth failures

---

## 📝 Code Snippets You'll Need

### Get Current User
```jsx
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const user = useQuery(api.users.currentUser);
```

### Check Authentication Status
```jsx
import { useConvexAuth } from "convex/react";

const { isAuthenticated, isLoading } = useConvexAuth();
```

### Protected Page
```jsx
"use client";

import { Authenticated } from "convex/react";
import { redirect } from "next/navigation";

export default function ProtectedPage() {
  return (
    <Authenticated>
      <YourProtectedContent />
    </Authenticated>
  );
}
```

### Role-Based Component
```jsx
const user = useQuery(api.users.currentUser);

if (user?.role !== "lawyer") {
  return <div>Lawyers only</div>;
}

return <LawyerContent />;
```

---

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Convex connection failed" | Check NEXT_PUBLIC_CONVEX_URL is correct |
| "User is null after sign in" | Ensure ConvexAuthProvider is wrapping your app |
| "OAuth redirect fails" | Verify OAuth providers are configured in Convex dashboard |
| "Protected routes not working" | Check that Authenticated component is used correctly |
| "User role not updating" | Clear browser cache and re-authenticate |

---

## 📞 Need Help?

1. **Check the main guide**: `convex/docs/authentication-guide.md`
2. **RBAC details**: `convex/docs/rbac-implementation.md`
3. **Convex Auth Docs**: https://labs.convex.dev/auth
4. **Contact backend team** for Convex-specific issues

---

## 🎯 Next Steps

Once authentication is working:
1. Implement role-based routing
2. Add user profile pages
3. Create lawyer/client dashboards
4. Set up protected API calls
5. Add audit logging for sensitive actions