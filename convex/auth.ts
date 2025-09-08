import Google from "@auth/core/providers/google";
import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { MutationCtx } from "./_generated/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Google, Password],
  callbacks: {
    async afterUserCreatedOrUpdated(ctx: MutationCtx, { userId }) {
      // Set minimal defaults after OAuth/password creation
      const user = await ctx.db.get(userId);
      if (!user?.lifecycle) {
        await ctx.db.patch(userId, {
          lifecycle: {
            createdAt: Date.now(),
            updatedAt: Date.now(),
            lastActiveAt: Date.now(),
          },
        });
      }
    },
  },
});
