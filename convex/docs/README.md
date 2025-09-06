# Convex Documentation for Access Alberta Legal

## 📚 Available Documentation

### For Frontend Developers

1. **[Authentication Guide](./authentication-guide.md)**
   - Complete guide for implementing authentication
   - OAuth and password-based auth setup
   - React components and hooks
   - Error handling and testing

2. **[Quick Integration Checklist](./quick-integration-checklist.md)**
   - 5-minute setup guide
   - Step-by-step integration checklist
   - Common code snippets
   - Troubleshooting guide

3. **[RBAC Implementation](./rbac-implementation.md)**
   - Role-based access control system
   - User roles and permissions
   - Protected routes and components
   - Security best practices

---

## 🚀 Getting Started

### For Frontend Developers
1. Start with the [Quick Integration Checklist](./quick-integration-checklist.md) for a 5-minute setup
2. Read the [Authentication Guide](./authentication-guide.md) for detailed implementation
3. Review [RBAC Implementation](./rbac-implementation.md) for role-based features

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