# Convex Architecture: API vs Implementation

## The Core Pattern (Convex 1.21+)

**Problem**: Calling wrapped Convex functions from other Convex functions bypasses validation and security.

**Solution**: Separate API layer from business logic.

```
convex/
├── model/           # Business logic (internal)
├── posts.js         # API endpoints (external)
└── users.js         # API endpoints (external)
```

## Key Understanding

```javascript
// convex/model/posts.js - INTERNAL (not exposed to frontend)
export async function getPostData(ctx, postId) {
  return await ctx.db.get(postId); // Direct DB access
}

// convex/posts.js - EXTERNAL (exposed to frontend)
export const getPost = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    return await getPostData(ctx, postId);
  }
});
```

**The Difference**:
- Regular `export` = Backend-only, importable by other backend files
- `export const x = query/mutation()` = Frontend-callable via `useQuery/useMutation`
- `export const x = action()` = Backend-only, for third-party API calls (NOT frontend-callable)

## When to Extract to Model Layer

**Extract when:**
- Logic is reused across endpoints
- Function is >10-15 lines  
- Business rules are involved
- You need to test in isolation

**Don't extract when:**
- Simple one-liner queries
- Logic is endpoint-specific
- It creates unnecessary abstraction

## Real-World Example

```javascript
// convex/posts.js
export const getSimplePost = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    return await ctx.db.get(postId); // Simple - no extraction needed
  }
});

export const getComplexPost = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    return await fetchCompletePost(ctx, postId); // Complex - extracted
  }
});

// convex/model/posts.js
export async function fetchCompletePost(ctx, postId) {
  const post = await ctx.db.get(postId);
  const comments = await getManyFrom(ctx, "comments", "postId", postId);
  const author = await ctx.db.get(post.authorId);
  // ... 50+ lines of complex logic
  return { post, comments, author };
}
```

## Migration Strategy

1. **Find direct function calls** (these break in 1.21+):
   ```javascript
   const result = await someQuery(ctx, args); // ❌ Breaks
   ```

2. **Extract shared logic**:
   ```javascript
   // Before
   export const complexQuery = query({
     handler: async (ctx, args) => {
       const result1 = await simpleQuery(ctx, { id: args.id }); // ❌
       return processResult(result1);
     }
   });

   // After
   export const complexQuery = query({
     handler: async (ctx, args) => {
       const result1 = await ctx.db.get(args.id); // ✅ Direct DB
       return processResult(result1);
     }
   });
   ```

## Naming Recommendations

**API Layer** (user-facing):
- `getPost`, `createPost`, `updatePost`

**Model Layer** (implementation):
- `fetchPostData`, `validatePostOwnership`, `enrichPostWithRelations`

## Benefits

- **Security**: Clear API boundaries
- **Performance**: No double validation overhead
- **Maintainability**: Separate concerns
- **Testing**: Isolated business logic

## Actions: External API Calls

**Actions handle third-party API calls and should NOT be exposed to frontend.**

```javascript
// ❌ DON'T expose actions to frontend
export const sendEmail = action({
  args: { to: v.string(), subject: v.string() },
  handler: async (ctx, args) => {
    await fetch("https://api.sendgrid.com/...");
  }
});

// ✅ DO: Frontend calls mutation, mutation schedules action
export const requestPasswordReset = mutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const user = await ctx.db.query("users").filter(q => q.eq(q.field("email"), email)).unique();
    if (!user) return { success: false };
    
    // Schedule background action
    await ctx.scheduler.runAfter(0, api.emails.sendPasswordReset, {
      email: user.email,
      resetToken: generateToken()
    });
    
    return { success: true };
  }
});
```

**Pattern**: `Frontend → Mutation → Action`
- Frontend calls mutation (fast, transactional)
- Mutation schedules action (background, external APIs)
- Frontend gets immediate response

## Error Handling Best Practices

**Don't let triggers crash your mutations!**

```javascript
// ✅ GOOD: Graceful error handling
triggers.register("users", async (ctx, change) => {
  if (change.newDoc && !change.oldDoc) {
    try {
      // Try to assign default role
      await ctx.db.insert("userRoles", { 
        userId: change.id, 
        role: "user" 
      });
    } catch (e) {
      // Log error, don't throw - mutation still succeeds
      console.error("Failed to assign default role:", e);
      // Optionally notify admin or create error record
    }
  }
});

// ❌ BAD: Trigger error crashes frontend mutation
triggers.register("users", async (ctx, change) => {
  // This throws error up to frontend
  await ctx.db.insert("userRoles", { userId: change.id, role: "user" });
});
```

**Rule**: Only throw errors for truly exceptional cases. Handle expected failures gracefully.

## Decision Framework

```
New function needed?
├── Called from frontend? → API layer (/convex/*.js)
├── External API calls? → Action (/convex/*.js, NOT frontend-callable)
├── Complex/reusable logic? → Model layer (/convex/model/*.js)
└── Simple endpoint logic? → Keep in API layer
```

## Summary

- **query/mutation** = Frontend-callable endpoints (validation, security)
- **action** = Backend-only for external APIs (NOT frontend-callable)
- **Regular functions** = Internal business logic (direct DB access)
- **Pattern**: Frontend → Mutation → Action (for external calls)
- **Error handling**: Catch and log in triggers, don't crash frontend
- Extract strategically, not blindly
- Keep API surface small and clear