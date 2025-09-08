import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  // Extended users table - single source of truth
  users: defineTable({
    // === Convex Auth default fields ===
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),

    // === RBAC (required from start) ===
    userType: v.union(
      v.literal("lawyer"),
      v.literal("end-user"),
      v.literal("admin")
    ),

    // === Profile fields ===
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    gender: v.optional(
      v.union(
        v.literal("male"),
        v.literal("female"),
        v.literal("other"),
        v.literal("prefer-not-to-say")
      )
    ),
    dateOfBirth: v.optional(v.string()),
    legalNeed: v.optional(v.string()),

    // === Location ===
    location: v.optional(
      v.object({
        city: v.optional(v.string()),
        province: v.optional(v.string()),
        postalCode: v.optional(v.string()),
      })
    ),

    // === PIPA/PIPEDA Compliance (optional with defaults in auth) ===
    consent: v.optional(
      v.object({
        terms: v.boolean(),
        privacy: v.boolean(),
        version: v.string(),
        timestamp: v.number(),
        marketing: v.optional(v.boolean()),
        dataProcessing: v.boolean(),
      })
    ),

    lifecycle: v.optional(
      v.object({
        createdAt: v.number(),
        updatedAt: v.number(),
        lastActiveAt: v.number(),
        deletionRequested: v.optional(v.number()),
        exportRequested: v.optional(v.number()),
      })
    ),

    privacyPrefs: v.optional(
      v.object({
        shareProfile: v.boolean(),
        allowAnalytics: v.boolean(),
        allowAI: v.boolean(),
        publicProfile: v.boolean(),
      })
    ),

    // === Onboarding ===
    onboardingComplete: v.boolean(),
    hasSpouse: v.optional(v.boolean()),
    hasChildren: v.optional(v.boolean()),
    employmentStatus: v.optional(v.string()),
    incomeRange: v.optional(v.string()),
    urgencyLevel: v.optional(v.string()),

    // === Preferences ===
    preferences: v.optional(
      v.object({
        language: v.optional(v.string()),
        communicationPreference: v.optional(
          v.union(
            v.literal("email"),
            v.literal("sms"),
            v.literal("phone"),
            v.literal("in-app")
          )
        ),
        emailNotifications: v.optional(v.boolean()),
        smsNotifications: v.optional(v.boolean()),
      })
    ),

  })
    .index("email", ["email"])
    .index("by_phone", ["phone"])
    .index("by_userType", ["userType"])
    .index("by_deletion", ["lifecycle.deletionRequested"]),

  // Consent audit log for compliance tracking
  consentAuditLog: defineTable({
    userId: v.id("users"),
    event: v.union(
      v.literal("terms_accepted"),
      v.literal("privacy_accepted"),
      v.literal("consent_withdrawn"),
      v.literal("consent_updated"),
      v.literal("marketing_opted_in"),
      v.literal("marketing_opted_out"),
      v.literal("data_export_requested"),
      v.literal("deletion_requested")
    ),
    version: v.string(),
    timestamp: v.number(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    metadata: v.optional(v.any()), // Flexible for different event types
  })
    .index("by_user", ["userId", "timestamp"])
    .index("by_event", ["event", "timestamp"]),

  // OAuth tokens with proper user reference
  oauthTokens: defineTable({
    userId: v.id("users"),
    provider: v.union(v.literal("google"), v.literal("microsoft")), // Type-safe provider enum
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    expiresAt: v.number(),
    scope: v.string(),
  }).index("by_user_provider", ["userId", "provider"]),

  lawyerProfiles: defineTable({
    userId: v.id("users"),
    barNumber: v.optional(v.string()),
    yearsOfExperience: v.optional(v.number()),
    firm: v.optional(v.string()),
    bio: v.optional(v.string()),
    hourlyRate: v.optional(v.number()),

    practiceAreas: v.optional(v.array(v.string())),
    courts: v.optional(v.array(v.string())),

    matchingCriteria: v.optional(
      v.object({
        acceptsLegalAid: v.optional(v.boolean()),
        languages: v.optional(v.array(v.string())),
        servicesOffered: v.optional(v.array(v.string())),
        clientTypes: v.optional(v.array(v.string())),
      })
    ),

    verified: v.optional(v.boolean()),
    active: v.optional(v.boolean()),
  })
    .index("by_userId", ["userId"])
    .index("by_barNumber", ["barNumber"]) // For uniqueness
    .index("by_practiceAreas", ["practiceAreas"])
    .index("by_active", ["active"]),

  conversations: defineTable({
    participant1Id: v.id("users"),
    participant2Id: v.id("users"),
    lastMessageAt: v.number(),
    lastMessagePreview: v.string(),
    participant1Unread: v.number(), // Count of unread messages
    participant2Unread: v.number(),
  })
    .index("by_participant1", ["participant1Id", "lastMessageAt"])
    .index("by_participant2", ["participant2Id", "lastMessageAt"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    content: v.string(),
    attachments: v.optional(v.array(v.string())),
    read: v.boolean(),
    timestamp: v.number(),
  })
    .index("by_conversation", ["conversationId", "timestamp"])
    .index("by_unread", ["conversationId", "read"]),

  forumThreads: defineTable({
    authorId: v.id("users"),
    title: v.string(),
    category: v.string(),
    tags: v.array(v.string()),
    content: v.string(),
    pinned: v.boolean(),
    closed: v.boolean(),
    viewCount: v.number(),
    lastActivityAt: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_author", ["authorId"])
    .index("by_tags", ["tags"])
    .index("by_lastActivity", ["lastActivityAt"]),

  forumPosts: defineTable({
    threadId: v.id("forumThreads"),
    authorId: v.id("users"),
    content: v.string(),
    isAnswer: v.boolean(),
    upvotes: v.number(), // Simple count for MVP
    timestamp: v.number(),
  })
    .index("by_thread", ["threadId", "timestamp"])
    .index("by_author", ["authorId"]),

  articles: defineTable({
    title: v.string(),
    slug: v.string(),
    content: v.string(),
    summary: v.string(),
    practiceArea: v.string(),
    tags: v.array(v.string()),
    court: v.optional(v.string()),
    authorId: v.optional(v.id("users")),
    sourceUrl: v.optional(v.string()),
    publishedAt: v.number(),
    lastUpdated: v.number(),

    // Required for vector index - empty array if no embedding yet
    embedding: v.array(v.float64()),
  })
    .index("by_slug", ["slug"])
    .index("by_practiceArea", ["practiceArea"])
    .index("by_tags", ["tags"])
    .index("by_publishedAt", ["publishedAt"])
    .searchIndex("search_content", {
      searchField: "content",
      filterFields: ["practiceArea", "tags"],
    })
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["practiceArea"],
    }),

  articleViews: defineTable({
    articleId: v.id("articles"),
    viewedAt: v.number(),
    userId: v.optional(v.id("users")),
  }).index("by_article", ["articleId"]),

  checklists: defineTable({
    userId: v.id("users"),
    title: v.string(),
    category: v.string(),
    description: v.optional(v.string()),
    progress: v.number(),
    status: v.union(
      v.literal("not-started"),
      v.literal("in-progress"),
      v.literal("completed")
    ),
    dueDate: v.optional(v.number()),
  })
    .index("by_user", ["userId", "status"])
    .index("by_category", ["category"]),

  checklistItems: defineTable({
    checklistId: v.id("checklists"),
    title: v.string(),
    description: v.optional(v.string()),
    order: v.number(),
    completed: v.boolean(),
    completedAt: v.optional(v.number()),
    assigneeId: v.optional(v.id("users")),
    documents: v.optional(v.array(v.string())),
  })
    .index("by_checklist", ["checklistId", "order"])
    .index("by_assignee", ["assigneeId"]),

  aiChatSessions: defineTable({
    userId: v.id("users"),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    context: v.optional(v.string()),
  }).index("by_user", ["userId", "startedAt"]),

  aiChatMessages: defineTable({
    sessionId: v.id("aiChatSessions"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    timestamp: v.number(),
  }).index("by_session", ["sessionId", "timestamp"]),
});