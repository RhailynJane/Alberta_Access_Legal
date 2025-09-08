# Consent Management Model - Implementation Guide

## Overview

The consent management system provides PIPA/PIPEDA compliant consent tracking with comprehensive audit logging. This document explains how the model layer works and how to build the API layer on top of it.

## Architecture

### Model Layer (`/convex/model/consent.ts`)
- **Purpose**: Business logic and data operations
- **Access**: Backend-only, imported by other Convex functions
- **Functions**: Core consent operations with validation and audit logging

### API Layer (`/convex/consent.ts`) - *To Be Created*
- **Purpose**: Public endpoints for frontend consumption
- **Access**: Frontend-accessible via Convex client
- **Functions**: Thin wrappers around model functions with argument validation

## Core Functions Reference

### 1. **getCurrentConsent(ctx, userId)**
```typescript
// Returns: Current consent object or null
const consent = await getCurrentConsent(ctx, userId);
// Result: { terms: true, privacy: true, dataProcessing: true, marketing?: boolean, version: "1.0", timestamp: number }
```

### 2. **updateConsent(ctx, userId, consentData, metadata?)**
```typescript
// Updates consent with audit logging
const newConsent = await updateConsent(ctx, userId, {
  terms: true,
  privacy: true, 
  dataProcessing: true,
  marketing: false
}, {
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0..."
});
```

### 3. **withdrawConsent(ctx, userId, consentTypes, metadata?)**
```typescript
// Withdraw specific consent types (only optional ones allowed)
await withdrawConsent(ctx, userId, ["marketing"], {
  ipAddress: "192.168.1.1",
  reason: "user_request"
});
```

### 4. **getConsentAuditLog(ctx, userId, options?)**
```typescript
// Get audit history with optional filtering
const auditLog = await getConsentAuditLog(ctx, userId, {
  limit: 50,
  eventType: "marketing_opted_out",
  fromTimestamp: Date.now() - (30 * 24 * 60 * 60 * 1000) // Last 30 days
});
```

### 5. **hasValidConsent(ctx, userId)**
```typescript
// Quick validation check
const isValid = await hasValidConsent(ctx, userId);
// Returns: boolean - true if all required consents are granted
```

## API Layer Implementation Guidelines

### Required API Endpoints

Based on the model layer, you should create these public API endpoints:

#### 1. **Query: `getMyConsent`**
```typescript
// /convex/consent.ts
export const getMyConsent = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx); // Auth helper
    return await getCurrentConsent(ctx, user._id);
  }
});
```

#### 2. **Mutation: `updateMyConsent`**
```typescript
export const updateMyConsent = mutation({
  args: {
    terms: v.optional(v.boolean()),
    privacy: v.optional(v.boolean()),
    dataProcessing: v.optional(v.boolean()),
    marketing: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const metadata = {
      ipAddress: ctx.request?.headers?.["x-forwarded-for"],
      userAgent: ctx.request?.headers?.["user-agent"]
    };
    return await updateConsent(ctx, user._id, args, metadata);
  }
});
```

#### 3. **Mutation: `withdrawMyConsent`**
```typescript
export const withdrawMyConsent = mutation({
  args: {
    consentTypes: v.array(v.string()),
    reason: v.optional(v.string())
  },
  handler: async (ctx, { consentTypes, reason }) => {
    const user = await requireUser(ctx);
    const metadata = {
      ipAddress: ctx.request?.headers?.["x-forwarded-for"],
      userAgent: ctx.request?.headers?.["user-agent"],
      reason
    };
    return await withdrawConsent(ctx, user._id, consentTypes, metadata);
  }
});
```

#### 4. **Query: `getMyConsentAuditLog`**
```typescript
export const getMyConsentAuditLog = query({
  args: {
    limit: v.optional(v.number()),
    eventType: v.optional(v.string()),
    fromTimestamp: v.optional(v.number()),
    toTimestamp: v.optional(v.number())
  },
  handler: async (ctx, options) => {
    const user = await requireUser(ctx);
    return await getConsentAuditLog(ctx, user._id, options);
  }
});
```

#### 5. **Internal: `checkUserConsent`** (for middleware)
```typescript
export const checkUserConsent = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await hasValidConsent(ctx, userId);
  }
});
```

### API Design Principles

#### 1. **User-Centric Endpoints**
- All public endpoints should operate on "my" data (current user)
- Use `requireUser(ctx)` to get current user ID
- Don't expose admin functions that can modify other users' consent

#### 2. **Automatic Metadata Capture**
```typescript
// Always capture request metadata for audit compliance
const metadata = {
  ipAddress: ctx.request?.headers?.["x-forwarded-for"] || 
             ctx.request?.headers?.["x-real-ip"],
  userAgent: ctx.request?.headers?.["user-agent"],
  timestamp: Date.now()
};
```

#### 3. **Error Handling Patterns**
```typescript
// Let model layer validation errors bubble up
try {
  return await updateConsent(ctx, user._id, args, metadata);
} catch (error) {
  // Model layer provides clear error messages
  throw error; // Re-throw as ConvexError if needed
}
```

#### 4. **Argument Validation**
```typescript
// Use Convex's built-in validation
args: {
  consentTypes: v.array(
    v.union(
      v.literal("terms"),
      v.literal("privacy"), 
      v.literal("dataProcessing"),
      v.literal("marketing")
    )
  )
}
```

## PIPA/PIPEDA Compliance Features

### 1. **Required vs Optional Consents**
```typescript
// Required (cannot be withdrawn without account deletion):
- terms: boolean (required: true)
- privacy: boolean (required: true)  
- dataProcessing: boolean (required: true)

// Optional (can be withdrawn):
- marketing: boolean (optional)
```

### 2. **Audit Trail Requirements**
Every consent operation automatically logs:
- **Event Type**: What happened (terms_accepted, consent_withdrawn, etc.)
- **Timestamp**: When it happened
- **Version**: Which consent policy version
- **IP Address**: Where it happened from
- **User Agent**: What browser/device
- **Metadata**: Additional context (reason, previous values, etc.)

### 3. **Data Subject Rights Support**
```typescript
// Right to access: getMyConsentAuditLog()
// Right to rectification: updateMyConsent()
// Right to erasure: withdrawMyConsent() + account deletion flow
// Right to portability: Export audit log in structured format
```

## Integration with Authentication

### During User Registration
```typescript
// In Password provider profile callback:
consent: {
  terms: true,        // Required during signup
  privacy: true,      // Required during signup
  dataProcessing: true, // Required during signup
  marketing: params.marketingConsent || false, // Optional
  version: "1.0",
  timestamp: Date.now()
}
```

### Middleware Integration
```typescript
// Check consent before sensitive operations
export const sensitiveOperation = mutation({
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const hasConsent = await hasValidConsent(ctx, user._id);
    
    if (!hasConsent) {
      throw new Error("Valid consent required for this operation");
    }
    
    // Proceed with operation
  }
});
```

## Frontend Integration Patterns

### 1. **Consent Status Check**
```typescript
// React component
const consent = useQuery(api.consent.getMyConsent);
const hasValidConsent = consent?.terms && consent?.privacy && consent?.dataProcessing;
```

### 2. **Consent Update Form**
```typescript
const updateConsent = useMutation(api.consent.updateMyConsent);

const handleConsentUpdate = async (formData) => {
  try {
    await updateConsent({
      marketing: formData.marketingOptIn
    });
    toast.success("Preferences updated");
  } catch (error) {
    toast.error(error.message);
  }
};
```

### 3. **Consent Withdrawal**
```typescript
const withdrawConsent = useMutation(api.consent.withdrawMyConsent);

const handleOptOut = async () => {
  try {
    await withdrawConsent({
      consentTypes: ["marketing"],
      reason: "user_preference"
    });
  } catch (error) {
    toast.error(error.message);
  }
};
```

## Testing Guidelines

### Unit Tests for Model Functions
```typescript
// Test model functions directly
describe("Consent Model", () => {
  test("updateConsent logs audit trail", async () => {
    const result = await updateConsent(ctx, userId, { marketing: false });
    const auditLog = await getConsentAuditLog(ctx, userId, { limit: 1 });
    expect(auditLog[0].event).toBe("marketing_opted_out");
  });
});
```

### Integration Tests for API Endpoints
```typescript
// Test API endpoints with convex-test
test("updateMyConsent requires authentication", async () => {
  await expect(
    t.mutation(api.consent.updateMyConsent, { marketing: false })
  ).rejects.toThrow("Authentication required");
});
```

## Performance Considerations

### 1. **Audit Log Pagination**
```typescript
// Always use limits for audit log queries
const auditLog = await getConsentAuditLog(ctx, userId, { 
  limit: 100 // Don't fetch unlimited records
});
```

### 2. **Consent Caching**
```typescript
// Consider caching consent status for frequently checked operations
// But always refresh after updates
```

### 3. **Batch Operations**
```typescript
// For bulk consent operations (admin tools), process in batches
// Use internal functions to avoid API rate limits
```

## Security Notes

### 1. **User Isolation**
- Public API endpoints only access current user's data
- Admin functions should be separate internal endpoints
- Never expose other users' consent data

### 2. **Audit Integrity** 
- Audit logs are append-only (no deletion/modification)
- Metadata capture happens automatically
- Version tracking prevents consent policy confusion

### 3. **Required Consent Protection**
- Model layer blocks withdrawal of required consents
- Account deletion is the only way to remove required consents
- Clear error messages guide users to proper deletion flow

## Migration and Versioning

### Adding New Consent Types
1. Update schema with optional field
2. Add to model layer constants
3. Update API validation schemas
4. Deploy backend first, then frontend

### Updating Consent Policies
1. Increment version number in model layer
2. Existing users keep old version until they update
3. New consent updates use new version
4. Audit log tracks version changes

## Common Pitfalls to Avoid

### ❌ **Don't**: Call model functions directly from frontend
```typescript
// Wrong - model functions aren't exposed
import { updateConsent } from "./model/consent";
```

### ✅ **Do**: Use API endpoints
```typescript
// Correct - use public API
const updateConsent = useMutation(api.consent.updateMyConsent);
```

### ❌ **Don't**: Skip audit logging
```typescript
// Wrong - bypasses compliance tracking
await ctx.db.patch(userId, { consent: newConsent });
```

### ✅ **Do**: Use model functions
```typescript
// Correct - includes automatic audit logging
await updateConsent(ctx, userId, consentData, metadata);
```

### ❌ **Don't**: Allow withdrawal of required consents
```typescript
// Wrong - would break compliance
await withdrawConsent(ctx, userId, ["terms", "privacy"]);
```

### ✅ **Do**: Handle required consent protection
```typescript
// Correct - model layer blocks this and provides clear error
try {
  await withdrawConsent(ctx, userId, consentTypes);
} catch (error) {
  // Show user account deletion option for required consents
}
```

## Next Steps

1. **Create API Layer**: Implement the public endpoints following these guidelines
2. **Add Auth Integration**: Ensure `requireUser()` helper exists
3. **Frontend Components**: Build consent management UI
4. **Testing Suite**: Add comprehensive test coverage
5. **Documentation**: Update API documentation for frontend team

This model layer provides the foundation for a fully compliant consent management system that meets PIPA/PIPEDA requirements while remaining developer-friendly.