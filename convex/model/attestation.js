/**
 * Lawyer Attestation Core Model Layer
 * 
 * Handles secure lawyer verification and attestation with LSA integration and audit logging.
 * This is the business logic layer - not exposed to frontend directly.
 * 
 * @module convex/model/attestation
 */

/**
 * Attestation event types for audit logging
 */
export const ATTESTATION_EVENTS = {
  ATTESTATION_SUBMITTED: "attestation_submitted",
  ATTESTATION_UPDATED: "attestation_updated"
};

/**
 * Current semantic version for attestation tracking
 */
export const CURRENT_ATTESTATION_VERSION = "1.0";

/**
 * Stub for future Law Society of Alberta (LSA) directory check
 * 
 * @param {string} barNumber - The lawyer's bar admission number
 * @returns {Promise<boolean>} Whether the lawyer is in good standing with LSA
 */
export async function verifyLSAStanding(barNumber) {
  // TODO: Implement actual check against LSA directory API
  console.log(`Verifying bar number: ${barNumber}`);
  return true; // Stubbed to return true for now
}

/**
 * Internal function to store the attestation with LSA verification
 * 
 * @param {any} ctx - Convex context with database access
 * @param {string} userId - User ID to store attestation for
 * @param {Object} attestation - Attestation data
 * @returns {Promise<string>} Created attestation ID
 */
export async function storeAttestation(ctx, userId, attestation) {
  // Verify LSA standing
  const lsaVerified = await verifyLSAStanding(attestation.barNumber);
  
  // Check if attestation already exists for this user
  const existingAttestation = await ctx.db
    .query("attestations")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();

  const attestationData = {
    userId,
    ...attestation,
    lsaVerified,
    attestedAt: Date.now(),
    attestationVersion: attestation.attestationVersion || CURRENT_ATTESTATION_VERSION
  };

  if (existingAttestation) {
    // Update existing attestation
    await ctx.db.patch(existingAttestation._id, attestationData);
    return existingAttestation._id;
  } else {
    // Create new attestation
    return await ctx.db.insert("attestations", attestationData);
  }
}

/**
 * Internal function to log the attestation event for compliance
 * 
 * @param {any} ctx - Convex context with database access
 * @param {string} userId - User ID the event relates to
 * @param {Object} attestation - Attestation data for metadata
 * @param {boolean} isUpdate - Whether this is an update to existing attestation
 * @returns {Promise<string>} Created audit log entry ID
 */
export async function logAttestationEvent(ctx, userId, attestation, isUpdate = false) {
  const event = isUpdate ? ATTESTATION_EVENTS.ATTESTATION_UPDATED : ATTESTATION_EVENTS.ATTESTATION_SUBMITTED;
  
  return await ctx.db.insert("consentAuditLog", {
    userId,
    event,
    version: attestation.attestationVersion || CURRENT_ATTESTATION_VERSION,
    timestamp: Date.now(),
    ipAddress: attestation.ipAddress,
    metadata: {
      barNumber: attestation.barNumber,
      legalName: attestation.legalName,
      isUpdate,
      attestationFields: {
        isLicensed: attestation.isLicensed,
        isInGoodStanding: attestation.isInGoodStanding,
        noDisciplinaryActions: attestation.noDisciplinaryActions,
        profileAccurate: attestation.profileAccurate,
        willUpdateOnChange: attestation.willUpdateOnChange,
        understandsLiability: attestation.understandsLiability
      }
    },
  });
}

/**
 * Retrieves the current attestation for a user
 * 
 * @param {any} ctx - Convex context with database access
 * @param {string} userId - User ID to get attestation for
 * @returns {Promise<Object|null>} Current attestation or null if not found
 */
export async function getCurrentAttestation(ctx, userId) {
  return await ctx.db
    .query("attestations")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
}

/**
 * Validates attestation data against legal requirements
 * 
 * @param {Object} attestationData - Attestation data to validate
 * @returns {Object} Validated attestation data
 * @throws {Error} If validation fails
 */
export async function validateAttestationRequirements(attestationData) {
  const errors = [];

  // Required string fields
  if (!attestationData.legalName || attestationData.legalName.trim() === '') {
    errors.push('Legal name is required');
  }

  if (!attestationData.barNumber || attestationData.barNumber.trim() === '') {
    errors.push('Bar number is required');
  }

  // Validate bar number format (basic Alberta format check)
  if (attestationData.barNumber && !/^[A-Z0-9]{4,10}$/.test(attestationData.barNumber.trim())) {
    errors.push('Bar number must be 4-10 alphanumeric characters');
  }

  // Required boolean fields (must be true for attestation to be valid)
  const requiredTrueFields = [
    'isLicensed',
    'isInGoodStanding', 
    'noDisciplinaryActions',
    'profileAccurate',
    'willUpdateOnChange',
    'understandsLiability'
  ];

  for (const field of requiredTrueFields) {
    if (attestationData[field] !== true) {
      errors.push(`${field} must be confirmed (true)`);
    }
  }

  // Validate version format if provided
  if (attestationData.attestationVersion && !/^\d+\.\d+(\.\d+)?$/.test(attestationData.attestationVersion)) {
    errors.push("Version must be in semantic version format (e.g., '1.0' or '1.0.0')");
  }

  if (errors.length > 0) {
    throw new Error(`Attestation validation failed: ${errors.join("; ")}`);
  }

  return attestationData;
}

/**
 * Checks if a user has a valid attestation
 * 
 * @param {any} ctx - Convex context with database access
 * @param {string} userId - User ID to check attestation for
 * @returns {Promise<boolean>} Whether user has a valid attestation
 */
export async function hasValidAttestation(ctx, userId) {
  const attestation = await getCurrentAttestation(ctx, userId);
  
  if (!attestation) {
    return false;
  }

  // Check all required fields are true
  const requiredFields = [
    'isLicensed',
    'isInGoodStanding', 
    'noDisciplinaryActions',
    'profileAccurate',
    'willUpdateOnChange',
    'understandsLiability'
  ];

  return requiredFields.every(field => attestation[field] === true);
}

/**
 * Retrieves attestation audit log for a user
 * 
 * @param {any} ctx - Convex context with database access
 * @param {string} userId - User ID to get audit log for
 * @param {Object} options - Optional filtering options
 * @returns {Promise<Array>} Array of audit log entries
 */
export async function getAttestationAuditLog(ctx, userId, options = {}) {
  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error("User not found");
  }

  let query = ctx.db
    .query("consentAuditLog")
    .withIndex("by_user", (q) => q.eq("userId", userId));

  // Filter to only attestation events
  query = query.filter((q) => 
    q.or(
      q.eq("event", ATTESTATION_EVENTS.ATTESTATION_SUBMITTED),
      q.eq("event", ATTESTATION_EVENTS.ATTESTATION_UPDATED)
    )
  );

  // Apply timestamp filters if provided
  if (options.fromTimestamp || options.toTimestamp) {
    query = query.filter((q) => {
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

  // Get results and sort by timestamp descending (newest first)
  let results = await query.collect();
  results = results.sort((a, b) => b.timestamp - a.timestamp);

  if (options.limit) {
    results = results.slice(0, options.limit);
  }

  return results;
}

/**
 * Row-Level Security helper for attestation access control
 * 
 * @param {any} ctx - Convex context with database access  
 * @param {string} currentUserId - ID of the user making the request
 * @param {string} targetUserId - ID of the user whose data is being accessed
 * @param {string} currentUserRole - Role of the user making the request
 * @returns {boolean} Whether access is allowed
 */
export function canAccessAttestation(currentUserId, targetUserId, currentUserRole) {
  // Users can access their own attestations
  if (currentUserId === targetUserId) {
    return true;
  }
  
  // Admins can access any attestation
  if (currentUserRole === "admin") {
    return true;
  }
  
  // All other access is denied
  return false;
}

/**
 * Enforces row-level security for attestation access
 * 
 * @param {any} ctx - Convex context with database access
 * @param {string} currentUserId - ID of the user making the request
 * @param {string} targetUserId - ID of the user whose data is being accessed
 * @param {string} currentUserRole - Role of the user making the request
 * @throws {Error} If access is denied
 */
export function enforceAttestationAccess(currentUserId, targetUserId, currentUserRole) {
  if (!canAccessAttestation(currentUserId, targetUserId, currentUserRole)) {
    throw new Error("Access denied: You can only access your own attestation data");
  }
}