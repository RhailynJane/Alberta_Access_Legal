# Nested Field Updates in Convex

## Issue
TypeScript error when using dot notation to update optional nested object fields:
```typescript
// This causes TS2353 error with optional nested objects
await ctx.db.patch(userId, {
  "lifecycle.lastActiveAt": Date.now(),
  "lifecycle.updatedAt": Date.now(),
});
```

## Solution
Update the entire nested object instead:
```typescript
const user = await ctx.db.get(userId);
if (!user) throw new Error("User not found");

const now = Date.now();

await ctx.db.patch(userId, {
  lifecycle: {
    createdAt: user.lifecycle?.createdAt ?? now,
    updatedAt: now,
    lastActiveAt: now,
    deletionRequested: user.lifecycle?.deletionRequested,
    exportRequested: user.lifecycle?.exportRequested,
  },
});
```

## Note
While Convex supports dot notation for nested field updates, TypeScript type generation may have issues with optional nested objects. Using the full object update pattern avoids these TypeScript errors.