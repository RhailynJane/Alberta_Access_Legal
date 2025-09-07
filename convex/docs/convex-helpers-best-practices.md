# Convex Helpers Best Practices Guide

This guide covers the top 5 tools and utilities available in the `convex-helpers` package that can significantly improve your Convex development experience. These tools are ranked by their impact and frequency of mention in Convex best practices and community resources.

## 1. Database Relationship Helpers

**Impact: Critical for relational data management**

Database relationship helpers (`getAll`, `getOneFrom`, `getManyFrom`, `getManyVia`) make it easy to traverse relationships in your Convex database, similar to SQL joins but with predictable, composable primitives.

### Installation
```bash
npm install convex-helpers
```

### Key Functions

#### `getAll(ctx, table)`
Retrieves all documents from a table.

```javascript
import { getAll } from "convex-helpers/server/relationships";

const allUsers = await getAll(ctx, "users");
```

#### `getOneFrom(ctx, table, field, value)`
Retrieves a single document based on a field value (one-to-one relationship).

```javascript
const userProfile = await getOneFrom(ctx, "profiles", "userId", user._id);
```

#### `getManyFrom(ctx, table, field, value)`
Retrieves multiple documents based on a field value (one-to-many relationship).

```javascript
const userPosts = await getManyFrom(ctx, "posts", "authorId", user._id);
```

#### `getManyVia(ctx, linkTable, field1, value, field2, targetTable)`
Handles many-to-many relationships through a junction table.

```javascript
// Get all roles for a user through user_roles junction table
const userRoles = await getManyVia(
  ctx,
  "userRoles",
  "userId",
  user._id,
  "roleId",
  "roles"
);
```

### Best Practices
- Use these helpers instead of manual queries for better code readability
- Combine with Convex indexes for optimal performance
- Create wrapper functions for commonly used relationship queries

### Example: Complete Relationship Pattern
```javascript
import { query } from "./_generated/server";
import { getOneFrom, getManyFrom, getManyVia } from "convex-helpers/server/relationships";

export const getUserWithRelations = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId);
    if (!user) return null;

    // One-to-one: Get user profile
    const profile = await getOneFrom(ctx, "profiles", "userId", userId);
    
    // One-to-many: Get user's posts
    const posts = await getManyFrom(ctx, "posts", "authorId", userId);
    
    // Many-to-many: Get user's roles
    const roles = await getManyVia(
      ctx, "userRoles", "userId", userId, "roleId", "roles"
    );

    return { user, profile, posts, roles };
  },
});
```

**Learn more**: [Database Relationship Helpers](https://stack.convex.dev/functional-relationships-helpers)

## 2. Triggers

**Impact: Essential for data consistency and side effects**

Triggers allow you to automatically run code whenever data in a table changes (insert, patch, replace, delete). This is crucial for implementing side effects, enforcing invariants, or keeping related data in sync.

### Setup
```javascript
import { Triggers } from "convex-helpers/server/triggers";

const triggers = new Triggers();
```

### Trigger Types

#### `onInsert`
Runs after a new document is inserted.

```javascript
triggers.register("users", async (ctx, change) => {
  if (change.operation === "insert") {
    // Create default profile for new user
    await ctx.db.insert("profiles", {
      userId: change.id,
      displayName: change.data.name,
      createdAt: Date.now(),
    });
  }
});
```

#### `onUpdate`
Runs after a document is updated (patch or replace).

```javascript
triggers.register("posts", async (ctx, change) => {
  if (change.operation === "update") {
    // Log content changes
    if (change.oldData.content !== change.data.content) {
      await ctx.db.insert("auditLog", {
        action: "post_updated",
        postId: change.id,
        oldContent: change.oldData.content,
        newContent: change.data.content,
        timestamp: Date.now(),
      });
    }
  }
});
```

#### `onDelete`
Runs after a document is deleted.

```javascript
triggers.register("users", async (ctx, change) => {
  if (change.operation === "delete") {
    // Cascade delete user data
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_author", q => q.eq("authorId", change.id))
      .collect();
    
    for (const post of posts) {
      await ctx.db.delete(post._id);
    }
  }
});
```

### Best Practices
- Keep trigger logic simple and fast
- Use triggers for maintaining data consistency
- Avoid recursive triggers (triggers that cause more triggers)
- Use for audit logging and cascade operations

### Example: Complete Trigger System
```javascript
import { mutation } from "./_generated/server";
import { Triggers } from "convex-helpers/server/triggers";

const triggers = new Triggers();

// Register all triggers
triggers.register("users", async (ctx, change) => {
  switch (change.operation) {
    case "insert":
      // Initialize user data
      await ctx.db.insert("userSettings", {
        userId: change.id,
        theme: "light",
        notifications: true,
      });
      break;
    case "delete":
      // Clean up user data
      const settings = await ctx.db
        .query("userSettings")
        .withIndex("by_user", q => q.eq("userId", change.id))
        .unique();
      if (settings) {
        await ctx.db.delete(settings._id);
      }
      break;
  }
});

// Wrap mutations with triggers
export const createUser = mutation({
  args: { name: v.string(), email: v.string() },
  handler: triggers.wrapMutation(async (ctx, args) => {
    return await ctx.db.insert("users", args);
  }),
});
```

**Learn more**: [Database Triggers](https://stack.convex.dev/triggers)

## 3. Custom Functions and Context Extension

**Impact: Critical for code organization and reusability**

Extend Convex's context and compose custom logic or middleware-like behavior inside your handlers, making your backend more modular and reusable.

### Custom Context Pattern
```javascript
import { customCtx, customMutation, customQuery } from "convex-helpers/server/customFunctions";

// Define custom context
const authCtx = customCtx(async (ctx) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthenticated");
  }
  
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", q => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  
  if (!user) {
    throw new Error("User not found");
  }
  
  return { user, identity };
});

// Use custom context in queries/mutations
export const getMyProfile = customQuery(
  authCtx,
  {
    args: {},
    handler: async (ctx) => {
      // ctx.user and ctx.identity are now available
      return ctx.user;
    },
  }
);
```

### Composing Multiple Contexts
```javascript
// Stack multiple contexts
const adminCtx = customCtx(authCtx, async (ctx) => {
  if (!ctx.user.isAdmin) {
    throw new Error("Admin access required");
  }
  return {};
});

export const adminAction = customMutation(
  adminCtx,
  {
    args: { action: v.string() },
    handler: async (ctx, args) => {
      // Both auth and admin checks are applied
      console.log(`Admin ${ctx.user.name} performed ${args.action}`);
    },
  }
);
```

### Best Practices
- Create reusable context extensions for common patterns
- Use for authentication, authorization, and rate limiting
- Keep context functions pure and predictable
- Document what each context adds to the handler

### Example: Complete Context System
```javascript
import { customCtx, customMutation, customQuery } from "convex-helpers/server/customFunctions";

// Base authentication context
const withAuth = customCtx(async (ctx) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");
  
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", q => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  
  return { user, identity };
});

// Rate limiting context
const withRateLimit = customCtx(withAuth, async (ctx) => {
  const key = `rate_limit:${ctx.user._id}`;
  const requests = await ctx.db
    .query("rateLimits")
    .withIndex("by_key", q => q.eq("key", key))
    .collect();
  
  const recentRequests = requests.filter(
    r => r.timestamp > Date.now() - 60000 // Last minute
  );
  
  if (recentRequests.length >= 10) {
    throw new Error("Rate limit exceeded");
  }
  
  await ctx.db.insert("rateLimits", {
    key,
    timestamp: Date.now(),
  });
  
  return {};
});

// Use composed contexts
export const sensitiveAction = customMutation(
  withRateLimit,
  {
    args: { data: v.string() },
    handler: async (ctx, args) => {
      // Has auth + rate limiting
      return await ctx.db.insert("sensitiveData", {
        userId: ctx.user._id,
        data: args.data,
      });
    },
  }
);
```

**Learn more**: [Discord: Extending Convex's context](https://discord.com/channels/1019350475847499849/1413514765078368459)

## 4. Advanced HTTP Endpoints with Hono

**Impact: Essential for REST API integration**

Integrate [Hono](https://hono.dev/) to build advanced HTTP endpoints with features like dynamic routes, middleware, and custom response formatting.

### Installation
```bash
npm install hono convex-helpers
```

### Basic Setup
```javascript
// convex/http.ts
import { httpRouter } from "convex/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HonoWithConvex } from "convex-helpers/server/hono";

const app = new HonoWithConvex();

// Add middleware
app.use("/*", cors());

// Define routes
app.get("/api/health", (c) => {
  return c.json({ status: "healthy" });
});

// Dynamic routes
app.get("/api/users/:id", async (c) => {
  const id = c.req.param("id");
  const user = await c.env.runQuery(api.users.getById, { id });
  
  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }
  
  return c.json(user);
});

// POST with validation
app.post("/api/users", async (c) => {
  const body = await c.req.json();
  
  // Validate input
  if (!body.name || !body.email) {
    return c.json({ error: "Name and email required" }, 400);
  }
  
  const userId = await c.env.runMutation(api.users.create, body);
  return c.json({ id: userId }, 201);
});

// Export for Convex
export default httpRouter({
  handler: app.fetch(),
});
```

### Middleware Examples
```javascript
// Authentication middleware
const authMiddleware = async (c, next) => {
  const token = c.req.header("Authorization");
  
  if (!token) {
    return c.json({ error: "No token provided" }, 401);
  }
  
  try {
    const user = await c.env.runQuery(api.auth.validateToken, { token });
    c.set("user", user);
    await next();
  } catch (error) {
    return c.json({ error: "Invalid token" }, 401);
  }
};

// Apply to specific routes
app.use("/api/protected/*", authMiddleware);

app.get("/api/protected/data", (c) => {
  const user = c.get("user");
  return c.json({ message: `Hello ${user.name}` });
});
```

### Best Practices
- Use Hono for complex REST APIs that need middleware
- Keep business logic in Convex functions, use Hono for HTTP handling
- Implement proper error handling and status codes
- Use middleware for cross-cutting concerns (auth, CORS, logging)

### Example: Complete REST API
```javascript
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { HonoWithConvex } from "convex-helpers/server/hono";

const app = new HonoWithConvex();

// Global middleware
app.use("*", cors());
app.use("*", logger());

// Error handling
app.onError((err, c) => {
  console.error(`${err}`);
  return c.json({ error: "Internal server error" }, 500);
});

// REST API routes
app.get("/api/v1/resources", async (c) => {
  const resources = await c.env.runQuery(api.resources.list);
  return c.json({ data: resources });
});

app.get("/api/v1/resources/:id", async (c) => {
  const id = c.req.param("id");
  const resource = await c.env.runQuery(api.resources.getById, { id });
  
  if (!resource) {
    return c.json({ error: "Resource not found" }, 404);
  }
  
  return c.json({ data: resource });
});

app.post("/api/v1/resources", async (c) => {
  const body = await c.req.json();
  const id = await c.env.runMutation(api.resources.create, body);
  return c.json({ data: { id } }, 201);
});

app.put("/api/v1/resources/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  await c.env.runMutation(api.resources.update, { id, ...body });
  return c.json({ data: { id } });
});

app.delete("/api/v1/resources/:id", async (c) => {
  const id = c.req.param("id");
  await c.env.runMutation(api.resources.delete, { id });
  return c.json({ data: { id } });
});

export default httpRouter({
  handler: app.fetch(),
});
```

**Learn more**: [Hono for Advanced HTTP Endpoints](https://stack.convex.dev/hono-with-convex)

## 5. OpenAPI (Swagger) Spec Generation

**Impact: Critical for API documentation and client generation**

Generate an OpenAPI (Swagger) specification for your Convex deployment, making it easy to create browsable API documentation or generate type-safe clients for other languages.

### Installation
```bash
npm install convex-helpers @hono/zod-openapi
```

### Basic Setup
```javascript
// convex/openapi.ts
import { OpenAPIHono } from "@hono/zod-openapi";
import { z } from "zod";
import { HonoWithConvex } from "convex-helpers/server/hono";

const app = new OpenAPIHono();

// Define schemas
const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.number(),
});

const ErrorSchema = z.object({
  error: z.string(),
});

// Define OpenAPI routes
app.openapi({
  method: "get",
  path: "/api/users/{id}",
  request: {
    params: z.object({
      id: z.string(),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: UserSchema,
        },
      },
      description: "User details",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: "User not found",
    },
  },
  handler: async (c) => {
    const { id } = c.req.valid("param");
    const user = await c.env.runQuery(api.users.getById, { id });
    
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }
    
    return c.json(user);
  },
});

// Generate OpenAPI spec
app.doc("/openapi.json", {
  openapi: "3.0.0",
  info: {
    version: "1.0.0",
    title: "Access Alberta Legal API",
    description: "API for Access Alberta Legal platform",
  },
  servers: [
    {
      url: "https://your-convex-deployment.convex.cloud",
      description: "Production server",
    },
  ],
});

// Swagger UI
app.get("/docs", (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>API Documentation</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
      </head>
      <body>
        <div id="swagger-ui"></div>
        <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
        <script>
          SwaggerUIBundle({
            url: "/openapi.json",
            dom_id: "#swagger-ui",
          });
        </script>
      </body>
    </html>
  `);
});
```

### Complete Example with Multiple Endpoints
```javascript
import { OpenAPIHono } from "@hono/zod-openapi";
import { z } from "zod";

const app = new OpenAPIHono();

// Schemas
const CreateUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(["client", "lawyer"]),
});

const UpdateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
});

const UserListSchema = z.object({
  data: z.array(UserSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
  }),
});

// POST /api/users
app.openapi({
  method: "post",
  path: "/api/users",
  request: {
    body: {
      content: {
        "application/json": {
          schema: CreateUserSchema,
        },
      },
    },
  },
  responses: {
    201: {
      content: {
        "application/json": {
          schema: z.object({
            id: z.string(),
          }),
        },
      },
      description: "User created successfully",
    },
    400: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: "Invalid input",
    },
  },
  handler: async (c) => {
    const body = c.req.valid("json");
    const id = await c.env.runMutation(api.users.create, body);
    return c.json({ id }, 201);
  },
});

// GET /api/users
app.openapi({
  method: "get",
  path: "/api/users",
  request: {
    query: z.object({
      page: z.string().regex(/^\d+$/).transform(Number).default("1"),
      limit: z.string().regex(/^\d+$/).transform(Number).default("10"),
      role: z.enum(["client", "lawyer"]).optional(),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: UserListSchema,
        },
      },
      description: "List of users",
    },
  },
  handler: async (c) => {
    const { page, limit, role } = c.req.valid("query");
    const users = await c.env.runQuery(api.users.list, { page, limit, role });
    return c.json(users);
  },
});

// PUT /api/users/{id}
app.openapi({
  method: "put",
  path: "/api/users/{id}",
  request: {
    params: z.object({
      id: z.string(),
    }),
    body: {
      content: {
        "application/json": {
          schema: UpdateUserSchema,
        },
      },
    },
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: UserSchema,
        },
      },
      description: "User updated successfully",
    },
    404: {
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
      description: "User not found",
    },
  },
  handler: async (c) => {
    const { id } = c.req.valid("param");
    const body = c.req.valid("json");
    const user = await c.env.runMutation(api.users.update, { id, ...body });
    
    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }
    
    return c.json(user);
  },
});
```

### Best Practices
- Define reusable schemas for consistency
- Include comprehensive error responses
- Add descriptions to all endpoints and parameters
- Version your API (`/api/v1/`)
- Use OpenAPI tags to group related endpoints

### Generating Client SDKs
Once you have your OpenAPI spec, you can generate client SDKs:

```bash
# Generate TypeScript client
npx openapi-typescript-codegen --input http://localhost:3000/openapi.json --output ./client

# Generate Python client
openapi-generator-cli generate -i http://localhost:3000/openapi.json -g python -o ./python-client

# Generate Go client
openapi-generator-cli generate -i http://localhost:3000/openapi.json -g go -o ./go-client
```

**Learn more**: [OpenAPI & Other Languages](https://docs.convex.dev/client/open-api)

## Summary

These five tools from `convex-helpers` provide powerful capabilities for building robust, maintainable, and well-documented Convex applications:

1. **Database Relationship Helpers** - Simplify relational data access
2. **Triggers** - Automate data consistency and side effects
3. **Custom Functions** - Create reusable, composable backend logic
4. **Hono Integration** - Build advanced REST APIs with middleware
5. **OpenAPI Generation** - Document and share your API

By incorporating these tools into your Convex development workflow, you'll write cleaner code, reduce bugs, and create more maintainable applications.

## Additional Resources

- [Convex Helpers GitHub](https://github.com/get-convex/convex-helpers)
- [Convex Stack Articles](https://stack.convex.dev/)
- [Convex Discord Community](https://discord.com/invite/convex)
- [Convex Documentation](https://docs.convex.dev/)