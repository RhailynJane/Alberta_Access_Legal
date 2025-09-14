import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { updateUserProfileImage, getUserProfileImageUrl, removeUserProfileImage } from "./model/users";

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    return await ctx.db.get(userId);
  },
});

export const updateLastActive = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const now = Date.now();
    
    // Use the entire lifecycle object to avoid TypeScript issues with dot notation
    await ctx.db.patch(userId, {
      lifecycle: {
        createdAt: user.lifecycle?.createdAt ?? now,
        updatedAt: now,
        lastActiveAt: now,
        deletionRequested: user.lifecycle?.deletionRequested,
        exportRequested: user.lifecycle?.exportRequested,
      },
    });
  },
});

// ===== Profile Image Upload Functions =====

/**
 * Generates a temporary upload URL for profile image
 * Frontend calls this first to get upload URL
 */
export const generateProfileImageUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Updates user profile with uploaded image storage ID
 * Frontend calls this after successful upload with the storageId
 */
export const updateProfileImage = mutation({
  args: {
    imageStorageId: v.id("_storage"),
  },
  handler: async (ctx, { imageStorageId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    
    return await updateUserProfileImage(ctx, userId, imageStorageId);
  },
});

/**
 * Gets the public URL for user's profile image
 * Frontend calls this to display the image
 */
export const getProfileImageUrl = query({
  args: {
    imageStorageId: v.id("_storage"),
  },
  handler: async (ctx, { imageStorageId }) => {
    return await getUserProfileImageUrl(ctx, imageStorageId);
  },
});

/**
 * Removes user's profile image
 * Frontend calls this to delete profile image
 */
export const removeProfileImage = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    
    return await removeUserProfileImage(ctx, userId);
  },
});
