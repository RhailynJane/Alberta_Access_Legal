import { convexTest } from "convex-test";
import { expect, test } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

test("user creation and onboarding flow", async () => {
  const t = convexTest(schema);

  // Test with simulated user identity
  const asAlice = t.withIdentity({
    subject: "alice123",
    name: "Alice Smith",
    email: "alice@example.com",
  });

  // Test mutations here...
});
