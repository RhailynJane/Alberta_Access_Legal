/**
 * Consent Management Core Model Layer
 * 
 * Handles PIPA/PIPEDA compliant consent tracking with comprehensive audit logging.
 * This is the business logic layer - not exposed to frontend directly.
 * 
 * @module convex/model/consent
 */

import { Id } from "../_generated/dataModel";

/**
 * Consent types that can be managed separately
 */
export const CONSENT_TYPES = {
  TERMS: "terms",
  PRIVACY: "privacy", 
  DATA_PROCESSING: "dataProcessing",
  MARKETING: "marketing"
} as const;

/**
 * Required consent types that must be true for valid consent
 */
export const REQUIRED_CONSENT_TYPES = [
  CONSENT_TYPES.TERMS,
  CONSENT_TYPES.PRIVACY,
  CONSENT_TYPES.DATA_PROCESSING
] as const;

/**
 * Optional consent types that can be withdrawn without account restrictions
 */
export const OPTIONAL_CONSENT_TYPES = [
  CONSENT_TYPES.MARKETING
] as const;

/**
 * Audit event types for consent tracking
 */
export const AUDIT_EVENTS = {
  TERMS_ACCEPTED: "terms_accepted",
  PRIVACY_ACCEPTED: "privacy_accepted", 
  CONSENT_WITHDRAWN: "consent_withdrawn",
  CONSENT_UPDATED: "consent_updated",
  MARKETING_OPTED_IN: "marketing_opted_in",
  MARKETING_OPTED_OUT: "marketing_opted_out",
  DATA_EXPORT_REQUESTED: "data_export_requested",
  DELETION_REQUESTED: "deletion_requested"
} as const;

/**
 * Current semantic version for consent tracking
 */
export const CURRENT_CONSENT_VERSION = "1.0";

/**
 * Retrieves the current consent status for a user
 * 
 * @param ctx - Convex context with database access
 * @param userId - User ID to get consent for
 * @returns Current consent object or null if user not found
 */
export async function getCurrentConsent(ctx: any, userId: Id<"users">) {
  const user = await ctx.db.get(userId);
  if (!user) {
    return null;
  }
  
  return user.consent || null;
}

/**
 * Updates user consent with comprehensive audit logging
 * 
 * @param ctx - Convex context with database access
 * @param userId - User ID to update consent for
 * @param consentData - New consent data to apply
 * @param metadata - Optional metadata (IP address, user agent, etc.)
 * @returns Updated consent object
 */
export async function updateConsent(
  ctx: any, 
  userId: Id<"users">, 
  consentData: {
    terms?: boolean;
    privacy?: boolean;
    dataProcessing?: boolean;
    marketing?: boolean;
    version?: string;
  },
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    [key: string]: any;
  }
) {
  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error("User not found");
  }

  // Validate consent requirements
  await validateConsentRequirements(consentData);
  
  const currentConsent = user.consent;
  const timestamp = Date.now();
  const version = consentData.version || CURRENT_CONSENT_VERSION;

  // Create new consent object
  const newConsent = {
    terms: consentData.terms ?? currentConsent?.terms ?? false,
    privacy: consentData.privacy ?? currentConsent?.privacy ?? false,
    dataProcessing: consentData.dataProcessing ?? currentConsent?.dataProcessing ?? false,
    marketing: consentData.marketing ?? currentConsent?.marketing,
    version,
    timestamp
  };

  // Update user record
  await ctx.db.patch(userId, { consent: newConsent });

  // Log audit events for changed consents
  await logConsentChanges(ctx, userId, currentConsent, newConsent, version, metadata);

  return newConsent;
}

/**
 * Withdraws specific consent types for a user
 * 
 * @param ctx - Convex context with database access
 * @param userId - User ID to withdraw consent for
 * @param consentTypes - Array of consent types to withdraw
 * @param metadata - Optional metadata for audit trail
 * @returns Updated consent object
 */
export async function withdrawConsent(
  ctx: any,
  userId: Id<"users">,
  consentTypes: string[],
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    [key: string]: any;
  }
) {
  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const currentConsent = user.consent;
  if (!currentConsent) {
    throw new Error("No consent record found for user");
  }

  // Validate consent types
  const validConsentTypes = Object.values(CONSENT_TYPES);
  const invalidTypes = consentTypes.filter(type => !validConsentTypes.includes(type as any));
  if (invalidTypes.length > 0) {
    throw new Error(`Invalid consent types: ${invalidTypes.join(", ")}`);
  }

  // Check if trying to withdraw required consents
  const requiredBeingWithdrawn = consentTypes.filter(type => 
    REQUIRED_CONSENT_TYPES.includes(type as any)
  );
  
  if (requiredBeingWithdrawn.length > 0) {
    // For required consents, we log the withdrawal but don't actually withdraw
    // This maintains compliance while preserving account functionality
    await logConsentEvent(ctx, userId, AUDIT_EVENTS.CONSENT_WITHDRAWN, {
      ...metadata,
      attemptedWithdrawal: requiredBeingWithdrawn,
      action: "blocked_required_consent_withdrawal",
      message: "Required consents cannot be withdrawn without account deletion"
    });
    
    throw new Error(
      `Cannot withdraw required consents: ${requiredBeingWithdrawn.join(", ")}. ` +
      "To withdraw required consents, please request account deletion."
    );
  }

  // Create updated consent object with withdrawn optional consents
  const newConsent = { ...currentConsent };
  const timestamp = Date.now();

  consentTypes.forEach(type => {
    if (type === CONSENT_TYPES.MARKETING) {
      delete newConsent.marketing; // Remove optional marketing consent
    }
  });

  newConsent.timestamp = timestamp;

  // Update user record
  await ctx.db.patch(userId, { consent: newConsent });

  // Log withdrawal events
  for (const consentType of consentTypes) {
    const event = consentType === CONSENT_TYPES.MARKETING 
      ? AUDIT_EVENTS.MARKETING_OPTED_OUT 
      : AUDIT_EVENTS.CONSENT_WITHDRAWN;
    
    await logConsentEvent(ctx, userId, event, {
      ...metadata,
      consentType,
      previousValue: (currentConsent as any)[consentType],
      action: "consent_withdrawn"
    });
  }

  return newConsent;
}

/**
 * Retrieves consent audit log for a user with optional filtering
 * 
 * @param ctx - Convex context with database access
 * @param userId - User ID to get audit log for
 * @param options - Optional filtering and pagination options
 * @returns Array of audit log entries
 */
export async function getConsentAuditLog(
  ctx: any,
  userId: Id<"users">,
  options?: {
    limit?: number;
    eventType?: string;
    fromTimestamp?: number;
    toTimestamp?: number;
  }
) {
  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error("User not found");
  }

  let query = ctx.db
    .query("consentAuditLog")
    .withIndex("by_user", (q: any) => q.eq("userId", userId));

  // Apply timestamp filters if provided
  if (options?.fromTimestamp || options?.toTimestamp) {
    query = query.filter((q: any) => {
      let filter = q;
      if (options.fromTimestamp) {
        filter = filter.gte("timestamp", options.fromTimestamp);
      }
      if (options.toTimestamp) {
        filter = filter.lte("timestamp", options.toTimestamp);
      }
      return filter;
    });
  }

  // Apply event type filter if provided
  if (options?.eventType) {
    query = query.filter((q: any) => q.eq("event", options.eventType));
  }

  // Apply limit and order by timestamp descending (newest first)
  let results = await query.collect();
  results = results.sort((a: any, b: any) => b.timestamp - a.timestamp);

  if (options?.limit) {
    results = results.slice(0, options.limit);
  }

  return results;
}

/**
 * Logs a consent-related event to the audit trail
 * 
 * @param ctx - Convex context with database access
 * @param userId - User ID the event relates to
 * @param event - Type of consent event
 * @param metadata - Additional event metadata
 * @returns Created audit log entry ID
 */
export async function logConsentEvent(
  ctx: any,
  userId: Id<"users">,
  event: string,
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    version?: string;
    [key: string]: any;
  }
) {
  const timestamp = Date.now();
  const version = metadata?.version || CURRENT_CONSENT_VERSION;

  return await ctx.db.insert("consentAuditLog", {
    userId,
    event,
    version,
    timestamp,
    ipAddress: metadata?.ipAddress,
    userAgent: metadata?.userAgent,
    metadata: metadata ? { ...metadata } : undefined
  });
}

/**
 * Validates consent data against PIPA/PIPEDA requirements
 * 
 * @param consentData - Consent data to validate
 * @returns Validated consent data
 * @throws Error if validation fails
 */
export async function validateConsentRequirements(consentData: any) {
  const errors: string[] = [];

  // Check required consent types
  for (const requiredType of REQUIRED_CONSENT_TYPES) {
    if (consentData.hasOwnProperty(requiredType) && !consentData[requiredType]) {
      errors.push(`${requiredType} consent is required and must be true`);
    }
  }

  // Validate version format (should be semantic version)
  if (consentData.version && !/^\d+\.\d+(\.\d+)?$/.test(consentData.version)) {
    errors.push("Version must be in semantic version format (e.g., '1.0' or '1.0.0')");
  }

  if (errors.length > 0) {
    throw new Error(`Consent validation failed: ${errors.join("; ")}`);
  }

  return consentData;
}

/**
 * Checks if a user has valid consent for platform usage
 * 
 * @param ctx - Convex context with database access
 * @param userId - User ID to check consent for
 * @returns Boolean indicating if user has valid consent
 */
export async function hasValidConsent(ctx: any, userId: Id<"users">) {
  const consent = await getCurrentConsent(ctx, userId);
  
  if (!consent) {
    return false;
  }

  // Check all required consent types are present and true
  return REQUIRED_CONSENT_TYPES.every(type => consent[type] === true);
}

/**
 * Helper function to log consent changes by comparing old and new consent
 * 
 * @param ctx - Convex context
 * @param userId - User ID
 * @param oldConsent - Previous consent state
 * @param newConsent - New consent state
 * @param version - Consent version
 * @param metadata - Additional metadata
 */
async function logConsentChanges(
  ctx: any,
  userId: Id<"users">,
  oldConsent: any,
  newConsent: any,
  version: string,
  metadata?: any
) {
  // Log overall update event
  await logConsentEvent(ctx, userId, AUDIT_EVENTS.CONSENT_UPDATED, {
    ...metadata,
    version,
    previousConsent: oldConsent,
    newConsent: newConsent
  });

  // Log specific consent type changes
  for (const consentType of Object.values(CONSENT_TYPES)) {
    const oldValue = oldConsent?.[consentType];
    const newValue = newConsent[consentType];

    // Skip if no change
    if (oldValue === newValue) continue;

    // Determine specific event type
    let specificEvent: string = AUDIT_EVENTS.CONSENT_UPDATED;
    
    if (consentType === CONSENT_TYPES.TERMS && newValue === true) {
      specificEvent = AUDIT_EVENTS.TERMS_ACCEPTED;
    } else if (consentType === CONSENT_TYPES.PRIVACY && newValue === true) {
      specificEvent = AUDIT_EVENTS.PRIVACY_ACCEPTED;
    } else if (consentType === CONSENT_TYPES.MARKETING && newValue === true) {
      specificEvent = AUDIT_EVENTS.MARKETING_OPTED_IN;
    } else if (consentType === CONSENT_TYPES.MARKETING && (newValue === false || newValue === undefined)) {
      specificEvent = AUDIT_EVENTS.MARKETING_OPTED_OUT;
    }

    await logConsentEvent(ctx, userId, specificEvent, {
      ...metadata,
      version,
      consentType,
      previousValue: oldValue,
      newValue: newValue,
      action: "consent_type_changed"
    });
  }
}