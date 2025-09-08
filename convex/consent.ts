import { query, mutation, internalQuery } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { 
  getCurrentConsent,
  updateConsent,
  withdrawConsent,
  getConsentAuditLog,
  hasValidConsent,
  CONSENT_TYPES
} from "./model/consent";

/**
 * Helper function to get current authenticated user
 * Throws error if not authenticated or user not found
 */
async function requireUser(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not authenticated");
  
  const user = await ctx.db.get(userId);
  if (!user) throw new Error("User not found");
  
  return user;
}

/**
 * Helper function to extract metadata from request headers
 */
function extractRequestMetadata(ctx: any) {
  return {
    ipAddress: ctx.request?.headers?.["x-forwarded-for"] || 
               ctx.request?.headers?.["x-real-ip"],
    userAgent: ctx.request?.headers?.["user-agent"]
  };
}

/**
 * Get current user's consent status
 */
export const getMyConsent = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return await getCurrentConsent(ctx, user._id);
  }
});

/**
 * Update current user's consent preferences
 */
export const updateMyConsent = mutation({
  args: {
    terms: v.optional(v.boolean()),
    privacy: v.optional(v.boolean()),
    dataProcessing: v.optional(v.boolean()),
    marketing: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const metadata = extractRequestMetadata(ctx);
    
    return await updateConsent(ctx, user._id, args, metadata);
  }
});

/**
 * Withdraw specific consent types for current user
 */
export const withdrawMyConsent = mutation({
  args: {
    consentTypes: v.array(
      v.union(
        v.literal(CONSENT_TYPES.TERMS),
        v.literal(CONSENT_TYPES.PRIVACY),
        v.literal(CONSENT_TYPES.DATA_PROCESSING),
        v.literal(CONSENT_TYPES.MARKETING)
      )
    ),
    reason: v.optional(v.string())
  },
  handler: async (ctx, { consentTypes, reason }) => {
    const user = await requireUser(ctx);
    const metadata = {
      ...extractRequestMetadata(ctx),
      reason
    };
    
    return await withdrawConsent(ctx, user._id, consentTypes, metadata);
  }
});

/**
 * Get consent audit log for current user
 */
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

/**
 * Internal function to check if a user has valid consent
 * Used by middleware and other internal operations
 */
export const checkUserConsent = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await hasValidConsent(ctx, userId);
  }
});