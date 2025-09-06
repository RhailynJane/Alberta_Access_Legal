import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  // Extend users with profiles - properly linked via ID
  userProfiles: defineTable({
    userId: v.id("users"), // Direct reference to auth users table
    email: v.string(), // denormalized for unique constraint checking
    phone: v.optional(v.string()),

    location: v.optional(
      v.object({
        city: v.optional(v.string()),
        province: v.optional(v.string()),
        postalCode: v.optional(v.string()),
      })
    ),

    userType: v.union(
      v.literal("lawyer"),
      v.literal("end-user"),
      v.literal("admin")
    ),

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

    // Onboarding
    onboardingComplete: v.boolean(),
    hasSpouse: v.optional(v.boolean()),
    hasChildren: v.optional(v.boolean()),
    employmentStatus: v.optional(v.string()),
    incomeRange: v.optional(v.string()),
    legalNeed: v.optional(v.string()),
    urgencyLevel: v.optional(v.string()),

    lawyerProfileId: v.optional(v.id("lawyerProfiles")),

    preferences: v.optional(
      v.object({
        language: v.optional(v.string()),
        communicationPreference: v.optional(v.string()),
        emailNotifications: v.optional(v.boolean()),
        smsNotifications: v.optional(v.boolean()),
      })
    ),
  })
    .index("by_userId", ["userId"])
    .index("by_email", ["email"]) // For uniqueness checking
    .index("by_phone", ["phone"])
    .index("by_userType", ["userType"]),

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
    barNumber: v.string(),
    yearsOfExperience: v.number(),
    firm: v.optional(v.string()),
    bio: v.string(),
    hourlyRate: v.optional(v.number()),

    practiceAreas: v.array(v.string()),
    courts: v.array(v.string()),

    matchingCriteria: v.object({
      acceptsLegalAid: v.boolean(),
      languages: v.array(v.string()),
      servicesOffered: v.array(v.string()),
      clientTypes: v.array(v.string()),
    }),

    verified: v.boolean(),
    active: v.boolean(),
  })
    .index("by_userId", ["userId"])
    .index("by_barNumber", ["barNumber"]) // For uniqueness
    .index("by_practiceAreas", ["practiceAreas"])
    .index("by_active", ["active"]),

  lawyerAvailability: defineTable({
    lawyerId: v.id("users"),
    dayOfWeek: v.number(), // 0-6
    startTime: v.string(), // "09:00"
    endTime: v.string(), // "17:00"
    isRecurring: v.boolean(),
    specificDate: v.optional(v.number()), // for one-off availability
  })
    .index("by_lawyer", ["lawyerId"])
    .index("by_date", ["specificDate"]),

  appointments: defineTable({
    lawyerId: v.id("users"),
    clientId: v.id("users"),
    scheduledAt: v.number(),
    endTime: v.number(), // Added for overlap checking
    duration: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("cancelled"),
      v.literal("completed")
    ),
    type: v.union(
      v.literal("consultation"),
      v.literal("follow-up"),
      v.literal("court-prep")
    ),
    notes: v.optional(v.string()),
    googleEventId: v.optional(v.string()),
    meetingLink: v.optional(v.string()),
  })
    .index("by_lawyer", ["lawyerId", "scheduledAt"])
    .index("by_client", ["clientId"])
    .index("by_lawyer_time", ["lawyerId", "scheduledAt", "endTime"]) // For overlap checking
    .index("by_status", ["status"]),

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
