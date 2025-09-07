# RBAC: Role Assignment at Signup - Best Practices

## The Simple, Robust Approach ✨

**Problem**: How do you assign roles (admin, lawyer, user) to new users during signup?

**Best Practice**: Use Convex Auth's Password provider `profile` callback - no triggers, actions, or post-signup mutations needed!

## Why This Approach Is Best

❌ **Complex approaches** (triggers, post-signup mutations, actions):
- More moving parts = more bugs
- Race conditions between signup and role assignment
- Harder to test and debug
- Can fail leaving users without roles

✅ **Simple approach** (profile callback):
- Role assigned atomically during signup
- One operation, no race conditions
- Built-in to Convex Auth
- Easy to test and maintain

## Complete Implementation

### 1. Define Users Schema with Union Type Role

```ts
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const schema = defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("lawyer"), 
      v.literal("user")
    ),
    // Additional fields as needed
    createdAt: v.number(),
    isActive: v.boolean()
  }),
  
  // Other tables for your RBAC system
  userSessions: defineTable({
    userId: v.id("users"),
    sessionId: v.string(),
    // ... session fields
  }),
  
  // Example: role-specific data
  lawyerProfiles: defineTable({
    userId: v.id("users"),
    barNumber: v.string(),
    specializations: v.array(v.string()),
    // ... lawyer-specific fields
  })
});

export default schema;
```

### 2. Create Custom Password Provider

```ts
// convex/auth/CustomPasswordProvider.ts
import { Password } from "@convex-dev/auth/providers/Password";
import { DataModel } from "../_generated/dataModel";

export default Password<DataModel>({
  profile(params, ctx) {
    // Validate role (extra safety)
    const validRoles = ["admin", "lawyer", "user"];
    const role = params.role as string;
    
    if (!validRoles.includes(role)) {
      throw new Error("Invalid role specified");
    }
    
    return {
      email: params.email as string,
      name: params.name as string,
      role: role as "admin" | "lawyer" | "user",
      createdAt: Date.now(),
      isActive: true
    };
  },
});
```

### 3. Configure Convex Auth

```ts
// convex/auth.ts
import { convexAuth } from "@convex-dev/auth/server";
import CustomPasswordProvider from "./auth/CustomPasswordProvider";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [CustomPasswordProvider],
});
```

### 4. Frontend Signup Form

```jsx
// components/SignupForm.jsx
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";

export function SignupForm() {
  const { signIn } = useAuthActions();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(event.currentTarget);
    
    try {
      await signIn("password", formData);
      // User is now signed up with role assigned!
    } catch (err) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="signup-form">
      <div>
        <label htmlFor="name">Full Name</label>
        <input 
          id="name"
          name="name" 
          type="text"
          placeholder="John Doe" 
          required 
        />
      </div>

      <div>
        <label htmlFor="email">Email</label>
        <input 
          id="email"
          name="email" 
          type="email"
          placeholder="john@example.com" 
          required 
        />
      </div>

      <div>
        <label htmlFor="password">Password</label>
        <input 
          id="password"
          name="password" 
          type="password"
          placeholder="••••••••" 
          required 
        />
      </div>

      <div>
        <label htmlFor="role">Account Type</label>
        <select id="role" name="role" required>
          <option value="">Select account type</option>
          <option value="user">Client (seeking legal help)</option>
          <option value="lawyer">Legal Professional</option>
          <option value="admin">Administrator</option>
        </select>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <button type="submit" disabled={loading}>
        {loading ? "Creating Account..." : "Sign Up"}
      </button>
    </form>
  );
}
```

### 5. Using Roles in Your App

```jsx
// hooks/useCurrentUser.js
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function useCurrentUser() {
  return useQuery(api.users.getCurrentUser);
}

// convex/users.js
import { query } from "./_generated/server";
import { auth } from "./auth";

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await auth.getUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});

// components/RoleBasedComponent.jsx
import { useCurrentUser } from "@/hooks/useCurrentUser";

export function LawyerDashboard() {
  const user = useCurrentUser();
  
  if (!user) return <div>Loading...</div>;
  
  // Role-based rendering
  if (user.role !== "lawyer") {
    return <div>Access denied. Lawyer account required.</div>;
  }
  
  return (
    <div>
      <h1>Welcome, {user.name}</h1>
      <p>Lawyer Dashboard</p>
      {/* Lawyer-specific content */}
    </div>
  );
}
```

## Advanced Patterns

### Role-Specific Additional Data

```ts
// convex/auth/CustomPasswordProvider.ts - Enhanced version
export default Password<DataModel>({
  profile(params, ctx) {
    const baseUser = {
      email: params.email as string,
      name: params.name as string,
      role: params.role as "admin" | "lawyer" | "user",
      createdAt: Date.now(),
      isActive: true
    };

    // Add role-specific validation
    if (params.role === "lawyer") {
      if (!params.barNumber) {
        throw new Error("Bar number is required for lawyer accounts");
      }
      
      // Could validate bar number format here
      return {
        ...baseUser,
        barNumber: params.barNumber as string,
      };
    }

    return baseUser;
  },
});
```

### Role Hierarchy Check

```ts
// convex/model/auth.js - Helper functions
export async function hasRole(ctx, requiredRole) {
  const userId = await auth.getUserId(ctx);
  if (!userId) return false;
  
  const user = await ctx.db.get(userId);
  if (!user) return false;
  
  const roleHierarchy = {
    user: 1,
    lawyer: 2,
    admin: 3
  };
  
  return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
}

// Usage in mutations/queries
export const adminOnlyAction = mutation({
  args: { data: v.string() },
  handler: async (ctx, args) => {
    if (!(await hasRole(ctx, "admin"))) {
      throw new Error("Admin access required");
    }
    
    // Admin-only logic here
  }
});
```

### Frontend Role Guards

```jsx
// components/RoleGuard.jsx
import { useCurrentUser } from "@/hooks/useCurrentUser";

export function RoleGuard({ allowedRoles, children, fallback }) {
  const user = useCurrentUser();
  
  if (!user) {
    return fallback || <div>Please log in</div>;
  }
  
  if (!allowedRoles.includes(user.role)) {
    return fallback || <div>Access denied</div>;
  }
  
  return children;
}

// Usage
<RoleGuard 
  allowedRoles={["lawyer", "admin"]} 
  fallback={<div>Lawyers and admins only</div>}
>
  <LawyerFeatures />
</RoleGuard>
```

## Testing Your RBAC Implementation

```javascript
// tests/auth.test.js
import { convexTest } from "convex-test";
import { api } from "../convex/_generated/api";

describe("Role Assignment at Signup", () => {
  test("assigns lawyer role during signup", async () => {
    const t = convexTest();
    
    // Simulate signup with lawyer role
    await t.run(async (ctx) => {
      // Mock the profile callback behavior
      const userId = await ctx.db.insert("users", {
        email: "lawyer@example.com",
        name: "Jane Lawyer",
        role: "lawyer",
        createdAt: Date.now(),
        isActive: true
      });
      
      const user = await ctx.db.get(userId);
      expect(user.role).toBe("lawyer");
    });
  });
  
  test("validates role during signup", async () => {
    const t = convexTest();
    
    // Test invalid role rejection
    await expect(
      t.run(async (ctx) => {
        await ctx.db.insert("users", {
          email: "test@example.com", 
          name: "Test User",
          role: "invalid_role" // This should fail schema validation
        });
      })
    ).rejects.toThrow();
  });
});
```

## Security Considerations

### 1. Role Validation
```ts
// Always validate roles on the backend
const VALID_ROLES = ["admin", "lawyer", "user"] as const;

if (!VALID_ROLES.includes(params.role)) {
  throw new Error("Invalid role specified");
}
```

### 2. Role-Based Access Control
```ts
// Example: Protect sensitive mutations
export const deleteUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    // Check if current user is admin
    const currentUser = await getCurrentUser(ctx);
    if (currentUser?.role !== "admin") {
      throw new Error("Admin access required");
    }
    
    await ctx.db.delete(userId);
  }
});
```

### 3. Frontend Role Enforcement (UI Only)
```jsx
// Remember: Frontend checks are for UX only, not security!
export function AdminPanel() {
  const user = useCurrentUser();
  
  // Hide UI for non-admins (but backend still enforces security)
  if (user?.role !== "admin") {
    return <div>Access denied</div>;
  }
  
  return <AdminContent />;
}
```

## Benefits of This Approach

✅ **Atomic**: Role assigned in single operation
✅ **Simple**: No complex trigger/action chains
✅ **Fast**: No additional round trips
✅ **Reliable**: Built into Convex Auth
✅ **Testable**: Easy to unit test
✅ **Type Safe**: Union types ensure valid roles
✅ **Maintainable**: Clear, straightforward code

## Common Pitfalls to Avoid

❌ **Don't use triggers for signup roles**
```javascript
// This creates race conditions and complexity
triggers.register("users", async (ctx, change) => {
  if (change.newDoc && !change.oldDoc) {
    // Race condition: what if this fails?
    await ctx.db.insert("userRoles", { userId: change.id, role: "user" });
  }
});
```

❌ **Don't rely on frontend-only role validation**
```javascript
// Backend must always validate roles
if (user.role === "admin") { // Always check backend!
  await sensitiveOperation();
}
```

❌ **Don't forget role hierarchy**
```javascript
// Consider role hierarchies where admins can do everything lawyers can do
const canAccess = user.role === "lawyer" || user.role === "admin";
```

## Summary

**The Golden Rule**: Use Convex Auth's `profile` callback to assign roles at signup - it's simple, atomic, and robust.

This approach gives you:
- **Immediate role assignment** during user creation
- **No race conditions** or complex trigger chains  
- **Type safety** with union types
- **Easy testing** and maintenance
- **Industry-standard** authentication flow

Your users get their roles assigned correctly every time, and your code stays clean and maintainable! 🚀