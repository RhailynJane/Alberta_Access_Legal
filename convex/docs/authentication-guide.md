# Frontend Authentication Guide

## Quick Start for Frontend Developers

This guide explains how to integrate authentication in the Access Alberta Legal platform using Convex Auth.

---

## 1. What You Need

### Environment Variable
Add the Convex deployment URL to your `.env.local`:
```env
NEXT_PUBLIC_CONVEX_URL=<provided-convex-url>
```

### Required Packages
```bash
npm install convex @convex-dev/auth
```

---

## 2. Authentication Components

### Sign In/Out Actions
```jsx
import { useAuthActions } from "@convex-dev/auth/react";

export function SignIn() {
  const { signIn } = useAuthActions();
  
  return (
    <>
      {/* OAuth Sign-in */}
      <button onClick={() => void signIn("github")}>
        Sign in with GitHub
      </button>
      <button onClick={() => void signIn("google")}>
        Sign in with Google
      </button>
      
      {/* Password Sign-in */}
      <form onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        void signIn("password", formData);
      }}>
        <input name="email" type="email" placeholder="Email" required />
        <input name="password" type="password" placeholder="Password" required />
        <button type="submit">Sign in</button>
      </form>
    </>
  );
}

export function SignOut() {
  const { signOut } = useAuthActions();
  return <button onClick={() => void signOut()}>Sign out</button>;
}
```

### Authentication State Management
```jsx
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";

export function App() {
  return (
    <>
      <AuthLoading>
        <LoadingSpinner />
      </AuthLoading>
      
      <Unauthenticated>
        <SignIn />
      </Unauthenticated>
      
      <Authenticated>
        <Dashboard />
        <SignOut />
      </Authenticated>
    </>
  );
}
```

---

## 3. User Roles & Access Control

### Check User Role
```jsx
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export function Dashboard() {
  const user = useQuery(api.users.currentUser);
  
  if (!user) return <LoadingSpinner />;
  
  return (
    <>
      {user.role === "lawyer" && <LawyerDashboard />}
      {user.role === "client" && <ClientDashboard />}
      {user.role === "admin" && <AdminDashboard />}
    </>
  );
}
```

---

## 4. Authentication Flow Diagram

```
User Action (clicks sign-in)
   ↓
Frontend (calls signIn from Convex Auth)
   ↓
Convex Backend (handles auth, creates/updates user)
   ↓
Auth Provider (GitHub/Google/Password)
   ↓
Frontend (receives auth state, shows authenticated UI)
```

---

## 5. Access Alberta Legal Specific Features

### User Registration Flow
For new users registering as lawyers or clients:

```jsx
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

export function RegisterForm({ userType }) {
  const { signIn } = useAuthActions();
  const updateUserRole = useMutation(api.users.updateRole);
  
  const handleRegister = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Sign up with password
    await signIn("password", formData);
    
    // Update user role after registration
    await updateUserRole({ role: userType });
  };
  
  return (
    <form onSubmit={handleRegister}>
      <input name="email" type="email" required />
      <input name="password" type="password" required />
      <input name="name" type="text" required />
      {userType === "lawyer" && (
        <>
          <input name="barNumber" type="text" required />
          <input name="practiceAreas" type="text" placeholder="Family Law, Criminal Law" />
        </>
      )}
      <button type="submit">Register as {userType}</button>
    </form>
  );
}
```

### Protected Routes
```jsx
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function ProtectedRoute({ children, allowedRoles }) {
  const user = useQuery(api.users.currentUser);
  const router = useRouter();
  
  useEffect(() => {
    if (user && !allowedRoles.includes(user.role)) {
      router.push("/unauthorized");
    }
  }, [user, allowedRoles, router]);
  
  if (!user) return <LoadingSpinner />;
  if (!allowedRoles.includes(user.role)) return null;
  
  return <>{children}</>;
}

// Usage
<ProtectedRoute allowedRoles={["lawyer", "admin"]}>
  <LawyerOnlyContent />
</ProtectedRoute>
```

---

## 6. Common Authentication Patterns

### Check if User is Authenticated
```jsx
import { useConvexAuth } from "convex/react";

export function NavBar() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  
  if (isLoading) return <LoadingSpinner />;
  
  return (
    <nav>
      {isAuthenticated ? <AuthenticatedNav /> : <PublicNav />}
    </nav>
  );
}
```

### Get Current User Data
```jsx
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

export function UserProfile() {
  const user = useQuery(api.users.currentUser);
  
  if (!user) return null;
  
  return (
    <div>
      <h2>Welcome, {user.name}</h2>
      <p>Email: {user.email}</p>
      <p>Role: {user.role}</p>
    </div>
  );
}
```

---

## 7. Error Handling

```jsx
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";

export function SignInWithError() {
  const { signIn } = useAuthActions();
  const [error, setError] = useState(null);
  
  const handleSignIn = async (provider) => {
    try {
      await signIn(provider);
    } catch (err) {
      setError(err.message);
    }
  };
  
  return (
    <>
      {error && <div className="error">{error}</div>}
      <button onClick={() => handleSignIn("github")}>
        Sign in with GitHub
      </button>
    </>
  );
}
```

---

## 8. Testing Authentication Locally

1. Ensure you have the correct `NEXT_PUBLIC_CONVEX_URL` in `.env.local`
2. Run `npm run dev` to start the development server
3. Test OAuth providers (GitHub/Google) - they should redirect properly
4. Test password authentication with email/password
5. Check that user roles are assigned correctly
6. Verify protected routes redirect unauthorized users

---

## 9. Key Points to Remember

- **No backend setup required** - Just use the provided Convex URL
- **All auth state is reactive** - Components automatically update when auth changes
- **Role-based access** is handled through the `users` table in Convex
- **Session management** is automatic - Convex handles tokens and refresh
- **OAuth and password auth** work side-by-side - users can use either method

---

## 10. Support & Resources

- [Convex Auth Documentation](https://labs.convex.dev/auth)
- [Convex React Hooks](https://docs.convex.dev/client/react)
- Project-specific questions: Contact backend team

---

## Quick Reference

```jsx
// Import everything you need
import { useAuthActions } from "@convex-dev/auth/react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

// Sign in
const { signIn } = useAuthActions();
await signIn("github"); // or "google" or "password"

// Sign out
const { signOut } = useAuthActions();
await signOut();

// Check auth state
const { isAuthenticated, isLoading } = useConvexAuth();

// Get current user
const user = useQuery(api.users.currentUser);
```