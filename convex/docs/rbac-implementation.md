# Role-Based Access Control (RBAC) Implementation

## Overview

Access Alberta Legal implements a comprehensive RBAC system to manage different user types and their permissions across the platform.

---

## User Roles

### 1. **Client** (`client`)
- Can browse legal resources
- Book appointments with lawyers
- Access community forum
- Use AI legal assistant
- Manage their cases and documents

### 2. **Lawyer** (`lawyer`)
- All client permissions
- Manage client cases
- Accept/decline appointments
- Create legal resources
- Moderate forum posts in their practice areas
- Access lawyer dashboard

### 3. **Admin** (`admin`)
- Full system access
- User management
- Content moderation
- System configuration
- Analytics and reporting

### 4. **Moderator** (`moderator`)
- Forum moderation
- Content review
- User report handling

---

## Database Schema Integration

### Users Table
- `role`: Enum of user roles
- `permissions`: Array of specific permissions
- `lawyerProfile`: Reference to lawyer-specific data
- `clientProfile`: Reference to client-specific data

### Practice Areas
Lawyers can specialize in:
- Family Law
- Criminal Law
- Corporate Law
- Real Estate Law
- Immigration Law
- Personal Injury
- Employment Law
- Intellectual Property
- Tax Law
- Estate Planning

---

## Frontend Implementation

### Role-Based Routing

```jsx
// app/layout.js
import { RoleProvider } from '@/contexts/RoleContext';

export default function RootLayout({ children }) {
  return (
    <RoleProvider>
      {children}
    </RoleProvider>
  );
}
```

```jsx
// contexts/RoleContext.js
import { createContext, useContext } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

const RoleContext = createContext();

export function RoleProvider({ children }) {
  const user = useQuery(api.users.currentUser);
  
  const hasPermission = (permission) => {
    if (!user) return false;
    return user.permissions?.includes(permission) || false;
  };
  
  const hasRole = (role) => {
    if (!user) return false;
    return user.role === role;
  };
  
  const isLawyerOrAdmin = () => {
    return hasRole('lawyer') || hasRole('admin');
  };
  
  return (
    <RoleContext.Provider value={{
      user,
      role: user?.role,
      hasPermission,
      hasRole,
      isLawyerOrAdmin
    }}>
      {children}
    </RoleContext.Provider>
  );
}

export const useRole = () => useContext(RoleContext);
```

### Protected Components

```jsx
// components/ProtectedContent.js
import { useRole } from '@/contexts/RoleContext';

export function LawyerOnly({ children }) {
  const { isLawyerOrAdmin } = useRole();
  
  if (!isLawyerOrAdmin()) {
    return <div>This content is only available to lawyers.</div>;
  }
  
  return children;
}

export function AdminOnly({ children }) {
  const { hasRole } = useRole();
  
  if (!hasRole('admin')) {
    return <div>Admin access required.</div>;
  }
  
  return children;
}

export function RequirePermission({ permission, children }) {
  const { hasPermission } = useRole();
  
  if (!hasPermission(permission)) {
    return <div>You don't have permission to access this.</div>;
  }
  
  return children;
}
```

---

## Permission System

### Available Permissions

```javascript
const PERMISSIONS = {
  // Content Management
  CREATE_RESOURCE: 'create_resource',
  EDIT_RESOURCE: 'edit_resource',
  DELETE_RESOURCE: 'delete_resource',
  PUBLISH_RESOURCE: 'publish_resource',
  
  // User Management
  VIEW_USERS: 'view_users',
  EDIT_USERS: 'edit_users',
  DELETE_USERS: 'delete_users',
  ASSIGN_ROLES: 'assign_roles',
  
  // Case Management
  VIEW_ALL_CASES: 'view_all_cases',
  MANAGE_CASES: 'manage_cases',
  ASSIGN_LAWYERS: 'assign_lawyers',
  
  // Forum Moderation
  MODERATE_POSTS: 'moderate_posts',
  DELETE_POSTS: 'delete_posts',
  BAN_USERS: 'ban_users',
  
  // Appointment Management
  VIEW_ALL_APPOINTMENTS: 'view_all_appointments',
  MANAGE_APPOINTMENTS: 'manage_appointments',
  
  // System Administration
  SYSTEM_CONFIG: 'system_config',
  VIEW_ANALYTICS: 'view_analytics',
  MANAGE_BILLING: 'manage_billing'
};
```

### Default Role Permissions

```javascript
const ROLE_PERMISSIONS = {
  client: [
    // Basic permissions for clients
  ],
  
  lawyer: [
    PERMISSIONS.CREATE_RESOURCE,
    PERMISSIONS.EDIT_RESOURCE,
    PERMISSIONS.MANAGE_CASES,
    PERMISSIONS.MANAGE_APPOINTMENTS
  ],
  
  moderator: [
    PERMISSIONS.MODERATE_POSTS,
    PERMISSIONS.DELETE_POSTS
  ],
  
  admin: [
    // Admins get all permissions
    ...Object.values(PERMISSIONS)
  ]
};
```

---

## Navigation Based on Roles

```jsx
// components/Navigation.js
import { useRole } from '@/contexts/RoleContext';
import Link from 'next/link';

export function Navigation() {
  const { role, hasPermission } = useRole();
  
  return (
    <nav>
      {/* Public Links */}
      <Link href="/">Home</Link>
      <Link href="/resources">Legal Resources</Link>
      <Link href="/forum">Community Forum</Link>
      
      {/* Client Links */}
      {role && (
        <>
          <Link href="/appointments">My Appointments</Link>
          <Link href="/messages">Messages</Link>
          <Link href="/cases">My Cases</Link>
        </>
      )}
      
      {/* Lawyer Links */}
      {role === 'lawyer' && (
        <>
          <Link href="/lawyer/dashboard">Lawyer Dashboard</Link>
          <Link href="/lawyer/clients">My Clients</Link>
          <Link href="/lawyer/calendar">Calendar</Link>
        </>
      )}
      
      {/* Admin Links */}
      {role === 'admin' && (
        <>
          <Link href="/admin">Admin Panel</Link>
          <Link href="/admin/users">User Management</Link>
          <Link href="/admin/analytics">Analytics</Link>
        </>
      )}
      
      {/* Permission-based Links */}
      {hasPermission('moderate_posts') && (
        <Link href="/moderation">Moderation Queue</Link>
      )}
    </nav>
  );
}
```

---

## API Integration Examples

### Check Permissions in API Calls

```jsx
// hooks/useAuthorizedMutation.js
import { useMutation } from 'convex/react';
import { useRole } from '@/contexts/RoleContext';

export function useAuthorizedMutation(mutation, requiredPermission) {
  const { hasPermission } = useRole();
  const mutate = useMutation(mutation);
  
  return async (...args) => {
    if (!hasPermission(requiredPermission)) {
      throw new Error('Insufficient permissions');
    }
    return mutate(...args);
  };
}

// Usage
const deleteResource = useAuthorizedMutation(
  api.resources.delete,
  'delete_resource'
);
```

---

## Security Best Practices

1. **Always verify permissions on the backend** - Frontend checks are for UX only
2. **Use role-based routing** - Redirect unauthorized users
3. **Hide unauthorized UI elements** - Don't show buttons/links users can't use
4. **Implement audit logging** - Track all permission-based actions
5. **Regular permission reviews** - Audit user roles and permissions periodically

---

## Testing RBAC

### Test Scenarios

1. **Client Access**
   - Can view public resources ✓
   - Cannot access lawyer dashboard ✗
   - Can book appointments ✓

2. **Lawyer Access**
   - Can access lawyer dashboard ✓
   - Can manage own clients ✓
   - Cannot access admin panel ✗

3. **Admin Access**
   - Full system access ✓
   - Can manage all users ✓
   - Can view all data ✓

### Test Users

```javascript
// For development testing
const TEST_USERS = {
  client: {
    email: 'client@test.com',
    password: 'testpass123',
    role: 'client'
  },
  lawyer: {
    email: 'lawyer@test.com',
    password: 'testpass123',
    role: 'lawyer'
  },
  admin: {
    email: 'admin@test.com',
    password: 'testpass123',
    role: 'admin'
  }
};
```

---

## Troubleshooting

### Common Issues

1. **User role not updating**
   - Check if the role update mutation is called after registration
   - Verify the user object is being refetched after role change

2. **Protected routes not working**
   - Ensure RoleProvider wraps the entire app
   - Check if user query is returning data

3. **Permissions not applying**
   - Verify permissions array in user object
   - Check if permission strings match exactly

---

## Future Enhancements

1. **Dynamic Permissions** - Allow admins to create custom permissions
2. **Role Hierarchy** - Implement role inheritance
3. **Temporary Permissions** - Time-based access grants
4. **Delegation** - Allow lawyers to delegate certain permissions to assistants
5. **Multi-factor Authentication** - Enhanced security for sensitive roles