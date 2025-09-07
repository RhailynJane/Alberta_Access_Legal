# Convex Error Handling Best Practices

## The Golden Rule: Don't Give Frontend Developers Nightmares 😴

**Core Principle**: Handle errors gracefully so frontend developers only deal with expected, actionable errors.

## Error Handling in Triggers

### ❌ Bad: Let Triggers Crash Mutations

```javascript
// This crashes the frontend mutation if role creation fails
triggers.register("users", async (ctx, change) => {
  if (change.newDoc && !change.oldDoc) {
    // Any error here crashes the user registration mutation
    await ctx.db.insert("userRoles", { 
      userId: change.id, 
      role: "user" 
    });
  }
});
```

**Problem**: Frontend calls `createUser` mutation, trigger fails, frontend gets unexpected error.

### ✅ Good: Graceful Error Handling

```javascript
triggers.register("users", async (ctx, change) => {
  if (change.newDoc && !change.oldDoc) {
    try {
      // Try to assign default role
      await ctx.db.insert("userRoles", { 
        userId: change.id, 
        role: "user" 
      });
    } catch (error) {
      // Log error, don't throw - mutation still succeeds
      console.error("Failed to assign default role to user:", change.id, error);
      
      // Optional: Create error record for admin review
      await ctx.db.insert("systemErrors", {
        type: "role_assignment_failed",
        userId: change.id,
        error: error.message,
        timestamp: Date.now()
      });
    }
  }
});
```

**Benefits**:
- User registration succeeds (main action completes)
- Error is logged for debugging
- Frontend gets expected success response
- Admin can review failed role assignments later

## When to Throw vs When to Catch

### ✅ Throw for Critical Errors

```javascript
export const transferMoney = mutation({
  args: { fromAccount: v.id("accounts"), toAccount: v.id("accounts"), amount: v.number() },
  handler: async (ctx, { fromAccount, toAccount, amount }) => {
    const from = await ctx.db.get(fromAccount);
    
    // Throw for business rule violations - frontend should handle these
    if (from.balance < amount) {
      throw new Error("Insufficient funds");
    }
    
    if (amount <= 0) {
      throw new Error("Amount must be positive");
    }
    
    // Critical: If this fails, we need to know
    await ctx.db.patch(fromAccount, { balance: from.balance - amount });
    await ctx.db.patch(toAccount, { balance: to.balance + amount });
  }
});
```

### ✅ Catch for Non-Critical Side Effects

```javascript
export const createPost = mutation({
  args: { title: v.string(), content: v.string() },
  handler: async (ctx, args) => {
    // Critical: Create the post (this must succeed)
    const postId = await ctx.db.insert("posts", {
      ...args,
      authorId: await getCurrentUserId(ctx),
      createdAt: Date.now()
    });
    
    // Non-critical: Send notifications (can fail gracefully)
    try {
      await ctx.scheduler.runAfter(0, api.notifications.notifyFollowers, {
        postId,
        authorId: await getCurrentUserId(ctx)
      });
    } catch (error) {
      console.error("Failed to schedule notifications:", error);
      // Post creation still succeeds
    }
    
    return postId;
  }
});
```

## Error Handling in Actions

### Pattern: Mutation Schedules Action

```javascript
// convex/auth.js
export const requestPasswordReset = mutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const user = await ctx.db.query("users")
      .filter(q => q.eq(q.field("email"), email))
      .unique();
    
    // Always return success to prevent email enumeration
    if (!user) {
      return { success: true, message: "If account exists, reset email sent" };
    }
    
    try {
      // Schedule email action
      await ctx.scheduler.runAfter(0, api.emails.sendPasswordResetEmail, {
        email: user.email,
        resetToken: generateSecureToken()
      });
      
      return { success: true, message: "Reset email sent" };
    } catch (error) {
      console.error("Failed to schedule password reset:", error);
      // Don't expose internal error to frontend
      return { success: false, message: "Unable to send reset email. Please try again." };
    }
  }
});

// convex/emails.js
export const sendPasswordResetEmail = action({
  args: { email: v.string(), resetToken: v.string() },
  handler: async (ctx, { email, resetToken }) => {
    try {
      await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${process.env.SENDGRID_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          to: email,
          subject: "Password Reset",
          html: `Click here to reset: ${resetToken}`
        })
      });
    } catch (error) {
      console.error("SendGrid API error:", error);
      // Action errors are logged, don't affect frontend
      // Could implement retry logic here
    }
  }
});
```

## Frontend-Friendly Error Messages

### ✅ Good: Actionable Error Messages

```javascript
export const updateProfile = mutation({
  args: { name: v.string(), email: v.string() },
  handler: async (ctx, { name, email }) => {
    const userId = await getCurrentUserId(ctx);
    
    // Check if email is already taken
    const existingUser = await ctx.db.query("users")
      .filter(q => q.and(
        q.eq(q.field("email"), email),
        q.neq(q.field("_id"), userId)
      ))
      .first();
    
    if (existingUser) {
      throw new Error("This email is already in use. Please choose a different email.");
    }
    
    // Validate email format
    if (!email.includes("@")) {
      throw new Error("Please enter a valid email address.");
    }
    
    await ctx.db.patch(userId, { name, email });
    return { success: true };
  }
});
```

### ❌ Bad: Technical Error Messages

```javascript
// Don't expose technical details
if (existingUser) {
  throw new Error("UNIQUE_CONSTRAINT_VIOLATION: duplicate key value violates unique constraint users_email_key");
}

// Don't expose internal system info
catch (error) {
  throw new Error(`Database error: ${error.stack}`);
}
```

## Error Categories and Handling

### 1. User Input Errors (Always Throw)
```javascript
// Validation errors - user can fix these
if (!title || title.length < 3) {
  throw new Error("Title must be at least 3 characters long");
}

if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
  throw new Error("Please enter a valid email address");
}
```

### 2. Business Rule Violations (Always Throw)
```javascript
// Permission errors
if (post.authorId !== currentUserId) {
  throw new Error("You can only edit your own posts");
}

// State violations
if (order.status === "shipped") {
  throw new Error("Cannot modify shipped orders");
}
```

### 3. External Service Failures (Usually Catch)
```javascript
try {
  await sendWelcomeEmail(user.email);
} catch (error) {
  console.error("Welcome email failed:", error);
  // User registration still succeeds
}
```

### 4. System Errors (Log and Transform)
```javascript
try {
  await criticalDatabaseOperation();
} catch (error) {
  console.error("Critical system error:", error);
  throw new Error("A system error occurred. Please try again later.");
}
```

## Error Logging Best Practices

### Structured Logging
```javascript
// Good: Structured, searchable logs
console.error("Payment processing failed", {
  userId: ctx.auth.getUserIdentity()?.subject,
  orderId,
  amount,
  error: error.message,
  timestamp: Date.now(),
  paymentProvider: "stripe"
});

// Bad: Unstructured logs
console.error("Error:", error);
```

### Error Tracking
```javascript
// Create error records for admin review
await ctx.db.insert("errorLogs", {
  type: "payment_failure",
  userId: getCurrentUserId(ctx),
  context: { orderId, amount },
  error: error.message,
  timestamp: Date.now(),
  resolved: false
});
```

## Testing Error Scenarios

```javascript
// Test error handling in your mutations
test("createPost throws error for invalid title", async () => {
  const t = convexTest();
  
  await expect(
    t.mutation(api.posts.create, { title: "", content: "test" })
  ).rejects.toThrow("Title must be at least 3 characters");
});

test("createPost handles notification failure gracefully", async () => {
  const t = convexTest();
  
  // Mock scheduler to throw error
  t.withMockScheduler((scheduler) => {
    scheduler.runAfter.mockRejectedValue(new Error("Scheduler down"));
  });
  
  // Post creation should still succeed
  const result = await t.mutation(api.posts.create, {
    title: "Test Post",
    content: "Content"
  });
  
  expect(result).toBeDefined();
});
```

## Summary: The Happy Frontend Developer Recipe 😊

1. **Throw for user-fixable errors** (validation, permissions, business rules)
2. **Catch and log side effect failures** (emails, notifications, non-critical features)
3. **Use clear, actionable error messages** (avoid technical jargon)
4. **Log errors with context** (user ID, operation details, timestamps)
5. **Test error scenarios** (both throwing and catching cases)
6. **Never expose internal system details** to the frontend

**Result**: Frontend developers get predictable, actionable errors they can handle gracefully in the UI. No more 3 AM "the backend is throwing weird errors" Slack messages! 🎉