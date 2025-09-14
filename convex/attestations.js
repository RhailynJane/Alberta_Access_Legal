import { query, mutation, internalQuery } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { attestationFields } from "./schema";
import { 
  storeAttestation,
  logAttestationEvent,
  getCurrentAttestation,
  validateAttestationRequirements,
  hasValidAttestation,
  getAttestationAuditLog
} from "./model/attestation";

/**
 * Helper function to get current authenticated user
 * Throws error if not authenticated or user not found
 */
async function requireUser(ctx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new ConvexError("Not authenticated");
  
  const user = await ctx.db.get(userId);
  if (!user) throw new ConvexError("User not found");
  
  return user;
}

/**
 * Helper function to extract metadata from request headers
 */
function extractRequestMetadata(ctx) {
  return {
    ipAddress: ctx.request?.headers?.["x-forwarded-for"] || 
               ctx.request?.headers?.["x-real-ip"],
    userAgent: ctx.request?.headers?.["user-agent"]
  };
}

/**
 * Helper function to enforce lawyer role authorization
 */
async function requireLawyer(ctx) {
  const user = await requireUser(ctx);
  
  if (user.userType !== "lawyer") {
    throw new ConvexError("Only users with the 'lawyer' role can submit an attestation.");
  }
  
  return user;
}

/**
 * Submit lawyer attestation with validation and audit logging
 */
export const submitAttestation = mutation({
  args: attestationFields,
  handler: async (ctx, args) => {
    // 1. Enforce authentication and authorization
    const user = await requireLawyer(ctx);
    
    // 2. Extract request metadata for audit trail
    const metadata = extractRequestMetadata(ctx);
    const attestationData = {
      ...args,
      ipAddress: metadata.ipAddress
    };
    
    // 3. Validate attestation requirements
    await validateAttestationRequirements(attestationData);
    
    // 4. Check if this is an update to existing attestation
    const existingAttestation = await getCurrentAttestation(ctx, user._id);
    const isUpdate = !!existingAttestation;
    
    // 5. Store attestation via business logic
    await storeAttestation(ctx, user._id, attestationData);
    
    // 6. Log the attestation event for audit trail
    await logAttestationEvent(ctx, user._id, attestationData, isUpdate);
    
    return { 
      success: true, 
      isUpdate,
      message: isUpdate ? "Attestation updated successfully" : "Attestation submitted successfully"
    };
  },
});

/**
 * Get current user's attestation
 */
export const getMyAttestation = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireLawyer(ctx);
    return await getCurrentAttestation(ctx, user._id);
  }
});

/**
 * Check if current user has valid attestation
 */
export const checkMyAttestationStatus = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireLawyer(ctx);
    const isValid = await hasValidAttestation(ctx, user._id);
    const attestation = await getCurrentAttestation(ctx, user._id);
    
    return {
      isValid,
      hasAttestation: !!attestation,
      attestedAt: attestation?.attestedAt,
      lsaVerified: attestation?.lsaVerified
    };
  }
});

/**
 * Get attestation audit log for current user
 */
export const getMyAttestationAuditLog = query({
  args: {
    limit: v.optional(v.number()),
    fromTimestamp: v.optional(v.number()),
    toTimestamp: v.optional(v.number())
  },
  handler: async (ctx, options) => {
    const user = await requireLawyer(ctx);
    return await getAttestationAuditLog(ctx, user._id, options);
  }
});

/**
 * Internal function to check if a user has valid attestation
 * Used by middleware and other internal operations
 */
export const checkUserAttestation = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await hasValidAttestation(ctx, userId);
  }
});

/**
 * Admin query to get attestation by user ID (admin only)
 */
export const getAttestationByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const currentUser = await requireUser(ctx);
    
    // Only admins can view other users' attestations
    if (currentUser.userType !== "admin") {
      throw new ConvexError("Only admins can view other users' attestations");
    }
    
    return await getCurrentAttestation(ctx, userId);
  }
});

/**
 * Admin query to get all attestations with pagination
 */
export const getAllAttestations = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    lsaVerified: v.optional(v.boolean())
  },
  handler: async (ctx, { limit = 50, offset = 0, lsaVerified }) => {
    const currentUser = await requireUser(ctx);
    
    // Only admins can view all attestations
    if (currentUser.userType !== "admin") {
      throw new ConvexError("Only admins can view all attestations");
    }
    
    let query = ctx.db.query("attestations");
    
    if (lsaVerified !== undefined) {
      query = query.withIndex("by_lsaVerified", (q) => q.eq("lsaVerified", lsaVerified));
    }
    
    const results = await query.collect();
    const total = results.length;
    
    // Apply pagination
    const paginatedResults = results
      .sort((a, b) => b.attestedAt - a.attestedAt)
      .slice(offset, offset + limit);
    
    return {
      attestations: paginatedResults,
      total,
      hasMore: offset + limit < total
    };
  }
});