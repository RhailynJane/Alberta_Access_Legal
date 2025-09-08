import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

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
