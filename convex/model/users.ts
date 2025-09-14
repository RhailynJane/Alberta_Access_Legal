import { Doc } from "../_generated/dataModel";

/**
 * Business logic for user profile image operations
 * Internal functions - not exposed to frontend
 */

/**
 * Updates user profile image with storage ID
 * @param ctx - Database context
 * @param userId - User ID to update
 * @param imageStorageId - Storage ID of uploaded image
 * @returns Updated user document
 */
export async function updateUserProfileImage(
  ctx: any,
  userId: string,
  imageStorageId: string
): Promise<Doc<"users"> | null> {
  // Validate that user exists
  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error("User not found");
  }

  // Update user with new image storage ID
  await ctx.db.patch(userId, { 
    image: imageStorageId,
    "lifecycle.updatedAt": Date.now()
  });

  // Return updated user
  return await ctx.db.get(userId);
}

/**
 * Retrieves user profile image URL from storage ID
 * @param ctx - Database context with storage access
 * @param imageStorageId - Storage ID of the image
 * @returns Public URL for the image
 */
export async function getUserProfileImageUrl(
  ctx: any,
  imageStorageId: string
): Promise<string | null> {
  try {
    return await ctx.storage.getUrl(imageStorageId);
  } catch (error) {
    console.error("Error getting image URL:", error);
    return null;
  }
}

/**
 * Removes user profile image
 * @param ctx - Database context
 * @param userId - User ID to update
 * @returns Updated user document
 */
export async function removeUserProfileImage(
  ctx: any,
  userId: string
): Promise<Doc<"users"> | null> {
  // Validate that user exists
  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error("User not found");
  }

  // Remove image reference
  await ctx.db.patch(userId, { 
    image: undefined,
    "lifecycle.updatedAt": Date.now()
  });

  // Return updated user
  return await ctx.db.get(userId);
}