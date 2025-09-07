# Convex Documentation for Access Alberta Legal

## 📚 Available Documentation

### For Frontend Developers

1. **[Frontend Data Flow (Simple)](./frontend-data-flow-simple.md)** 🚀 **START HERE**
   - 3-minute visual guide to useQuery/useMutation
   - Pizza ordering analogy
   - Everything you need to know to get started

2. **[Authentication Guide](./authentication-guide.md)**
   - Complete guide for implementing authentication
   - OAuth and password-based auth setup
   - React components and hooks
   - Error handling and testing

3. **[Quick Integration Checklist](./quick-integration-checklist.md)**
   - 5-minute setup guide
   - Step-by-step integration checklist
   - Common code snippets
   - Troubleshooting guide

4. **[RBAC Implementation](./rbac-implementation.md)**
   - Role-based access control system
   - User roles and permissions
   - Protected routes and components
   - Security best practices

### For Backend Developers

1. **[Convex Architecture Patterns (Concise)](./convex-architecture-patterns-concise.md)** ⭐ **START HERE**
   - Essential API vs Implementation separation pattern
   - Actions and external API calls
   - When to extract logic to model layer
   - Quick migration guide

2. **[Error Handling Best Practices](./error-handling-best-practices.md)** 💤 **SAVE FRONTEND NIGHTMARES**
   - Graceful error handling in triggers and actions
   - When to throw vs when to catch
   - Frontend-friendly error messages
   - Logging and testing strategies

3. **[RBAC: Role Assignment at Signup](./rbac-role-assignment-signup.md)** 🔐 **SIMPLE & ROBUST**
   - Best practice for assigning roles during signup
   - Using Convex Auth's profile callback (no triggers needed!)
   - Complete implementation with frontend and backend
   - Role-based access control patterns

4. **[Convex Helpers Best Practices](./convex-helpers-best-practices.md)**
   - Top 5 power tools from convex-helpers package
   - Database relationship helpers
   - Triggers and custom functions
   - Hono integration and OpenAPI generation

5. **[Convex Architecture Patterns (Detailed)](./convex-architecture-patterns.md)**
   - Complete guide with examples and edge cases
   - Testing strategies and advanced patterns
   - Migration guide and common pitfalls

---

## 🚀 Getting Started

### For Frontend Developers
1. Start with [Frontend Data Flow (Simple)](./frontend-data-flow-simple.md) - understand the basics in 3 minutes
2. Use the [Quick Integration Checklist](./quick-integration-checklist.md) for setup
3. Read [Authentication Guide](./authentication-guide.md) for auth implementation
4. Review [RBAC Implementation](./rbac-implementation.md) for role-based features

### For Backend Developers  
1. **START HERE**: Read [Convex Architecture Patterns (Concise)](./convex-architecture-patterns-concise.md)
2. **CRITICAL**: Read [Error Handling Best Practices](./error-handling-best-practices.md) to keep frontend happy
3. **FOR THIS PROJECT**: Read [RBAC: Role Assignment at Signup](./rbac-role-assignment-signup.md) for user roles
4. Review [Convex Helpers Best Practices](./convex-helpers-best-practices.md) for powerful utilities
5. Refer to [detailed architecture guide](./convex-architecture-patterns.md) for complex scenarios
6. Always follow the Model/API separation pattern

### Required Information from Backend Team
- Convex deployment URL (for `NEXT_PUBLIC_CONVEX_URL`)
- OAuth provider configuration status
- Available API endpoints
- Test user credentials

---

## 🏗️ Project Architecture

```
Access Alberta Legal
├── Frontend (Next.js)
│   ├── Authentication UI
│   ├── Role-based routing
│   └── Protected components
│
├── Backend (Convex)
│   ├── Auth configuration
│   ├── Database schema
│   ├── RBAC logic
│   └── API endpoints
│
└── Features
    ├── Client portal
    ├── Lawyer dashboard
    ├── Admin panel
    └── Community forum
```

---

## 👥 User Roles

| Role | Description | Key Features |
|------|-------------|--------------|
| **Client** | Legal service seekers | Browse resources, book appointments, use AI assistant |
| **Lawyer** | Legal professionals | Manage cases, accept appointments, create content |
| **Admin** | System administrators | Full system access, user management, analytics |
| **Moderator** | Content moderators | Forum moderation, content review |

---

## 🔗 Quick Links

- [Convex Documentation](https://docs.convex.dev)
- [Convex Auth Documentation](https://labs.convex.dev/auth)
- [Next.js Documentation](https://nextjs.org/docs)
- [Project Repository](https://github.com/yourusername/alberta-access-legal)

---

## 📝 Notes

- All authentication is handled through Convex Auth
- OAuth providers supported: GitHub, Google
- Password-based authentication also available
- Session management is automatic
- Role-based access control is enforced at both frontend and backend

---

## 🤝 Collaboration

### Backend Provides:
- Configured Convex deployment
- Auth providers setup
- Database schema
- API endpoints

### Frontend Implements:
- Authentication UI
- Protected routes
- Role-based components
- User experience

---

Last updated: November 2024