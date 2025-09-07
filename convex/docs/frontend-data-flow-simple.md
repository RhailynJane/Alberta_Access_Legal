# Convex Data Flow for Frontend Developers 🚀

**Read time: 3 minutes** ⏱️

## The Big Picture: It's Like Ordering Pizza! 🍕

```
YOU (Frontend)          PIZZA SHOP (Backend)         KITCHEN (Database)
     📱                      🏪                          👨‍🍳
     │                       │                           │
     ├──"I want pizza"──────>│                           │
     │   useQuery()          │──"Get pizza #5"────────>│
     │                       │                           │
     │<──"Here's your pizza"─│<──"Pizza #5: Pepperoni"──│
```

## The Two Magic Hooks You Need 🪝

### 1. `useQuery` - Getting Data (Like Reading)
```javascript
// Frontend Component
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

function ShowPost() {
  // This magically gets data from backend!
  const post = useQuery(api.posts.getPost, { postId: "123" });
  
  return <div>{post?.title}</div>;
}
```

### 2. `useMutation` - Changing Data (Like Writing)
```javascript
// Frontend Component  
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

function CreatePost() {
  // This magically sends changes to backend!
  const createPost = useMutation(api.posts.createPost);
  
  const handleSubmit = () => {
    createPost({ title: "Hello", content: "World" });
  };
  
  return <button onClick={handleSubmit}>Create Post</button>;
}
```

## The Perfect Couples 💑

```javascript
// BACKEND (convex/posts.js)
export const getPost = query({...});     // 💑 Partners with useQuery
export const createPost = mutation({...}); // 💑 Partners with useMutation

// FRONTEND (your React component)
const post = useQuery(api.posts.getPost);        // 💑 Partners with query
const create = useMutation(api.posts.createPost); // 💑 Partners with mutation
```

## The Complete Flow (Like a Restaurant) 🍽️

```
1. CUSTOMER (Frontend)
   └── "I'll have the burger!" (useQuery/useMutation)
       ↓
2. WAITER (query/mutation in convex/)
   └── Writes down order, checks if valid
       ↓
3. KITCHEN (model functions)
   └── Actually makes the burger
       ↓
4. DATABASE (ctx.db)
   └── The ingredients storage
```

## Real Example: Getting a Post

```javascript
// STEP 1: Frontend asks for data
// components/PostView.jsx
function PostView({ id }) {
  const post = useQuery(api.posts.getPostWithAuthor, { postId: id });
  //         ^^^^^^^^^^ This is your waiter taking the order
  
  if (!post) return <div>Loading...</div>;
  return (
    <article>
      <h1>{post.title}</h1>
      <p>By {post.author.name}</p>
    </article>
  );
}

// STEP 2: Backend receives request
// convex/posts.js (The Waiter)
export const getPostWithAuthor = query({
  args: { postId: v.id("posts") }, // Checks your order is valid
  handler: async (ctx, { postId }) => {
    // Waiter goes to kitchen
    return await fetchPostWithAuthor(ctx, postId);
  }
});

// STEP 3: Backend does the work
// convex/model/posts.js (The Kitchen)
export async function fetchPostWithAuthor(ctx, postId) {
  // Kitchen has direct access to ingredients (database)
  const post = await ctx.db.get(postId);
  const author = await ctx.db.get(post.authorId);
  return { ...post, author };
}
```

## Creating Data: The Same Pattern!

```javascript
// Frontend (You ordering)
function CreatePostForm() {
  const createPost = useMutation(api.posts.create);
  
  const handleSubmit = (e) => {
    e.preventDefault();
    createPost({ 
      title: "My Cool Post",
      content: "This is awesome!" 
    });
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input name="title" />
      <textarea name="content" />
      <button type="submit">Post!</button>
    </form>
  );
}

// Backend (Waiter + Kitchen)
// convex/posts.js
export const create = mutation({
  args: { 
    title: v.string(),
    content: v.string() 
  },
  handler: async (ctx, args) => {
    // Could do everything here for simple stuff
    // Or call kitchen (model) for complex recipes
    return await ctx.db.insert("posts", {
      ...args,
      createdAt: Date.now()
    });
  }
});
```

## The 5 Rules to Remember 📝

1. **Frontend uses hooks**: `useQuery` (read) and `useMutation` (write)
2. **Backend defines endpoints**: `query` (read) and `mutation` (write)
3. **They're couples**: `useQuery` ↔️ `query`, `useMutation` ↔️ `mutation`
4. **Real-time magic**: Data updates automatically (no refresh needed!)
5. **Type-safe**: TypeScript knows what data you're getting

## Common Patterns You'll Use

### Loading States
```javascript
function MyComponent() {
  const data = useQuery(api.stuff.getStuff);
  
  if (data === undefined) return <div>Loading...</div>;
  if (data === null) return <div>Not found</div>;
  return <div>{data.name}</div>;
}
```

### Forms with Mutations
```javascript
function MyForm() {
  const doThing = useMutation(api.stuff.createThing);
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (data) => {
    setLoading(true);
    await doThing(data);
    setLoading(false);
  };
  
  return <form>...</form>;
}
```

### Conditional Queries
```javascript
function ConditionalData({ userId }) {
  // Skip query if no userId
  const userData = useQuery(
    api.users.getUser,
    userId ? { userId } : "skip"
  );
  
  if (!userId) return <div>Please log in</div>;
  return <div>{userData?.name}</div>;
}
```

## That's It! 🎉

You now understand:
- **useQuery** = Get data from backend
- **useMutation** = Send changes to backend  
- **Real-time** = Everything updates automatically
- **Type-safe** = TypeScript helps you

The backend team handles the complex stuff. You just use the hooks!

## Quick Reference Card

| I want to... | Use this hook | Pairs with backend |
|-------------|---------------|-------------------|
| Get data | `useQuery` | `query` |
| Create something | `useMutation` | `mutation` |
| Update something | `useMutation` | `mutation` |
| Delete something | `useMutation` | `mutation` |

## What About Actions? 🤔

You might see `action` functions in the backend, but **don't use them directly!**

```javascript
// ❌ DON'T do this in your components
const sendEmail = useAction(api.emails.sendEmail); // No! Don't call actions!

// ✅ DO this instead
const resetPassword = useMutation(api.auth.requestPasswordReset); // Call mutation!
```

**Why?** Actions are for external API calls (like sending emails). The backend handles them automatically.

**The Pattern:**
```
Your Component → useMutation → Backend Mutation → Backend Action → External API
     🖥️              🔄              🏪                🔧            📧
```

You just call the mutation. The backend does the rest! Keep it simple. 😊

**Remember**: You're the customer, not the cook! Just order what you need with hooks. 🍔