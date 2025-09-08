# Custom Password Provider for Onboarding

## Why We Override the Default Password Provider

### Default Password Provider Limitations
The default Convex Auth Password provider is minimal:
```ts
// Default provider only handles:
{
  email: string,
  name?: string  // optional
}
```

### Our Legal Platform Requirements
Our platform needs extensive user data during signup:
- **User type** (lawyer vs end-user vs admin) - critical for RBAC
- **Legal information** (practice areas, urgency, location)  
- **Preferences** (meeting types, lawyer gender preference)
- **Compliance data** (PIPA/PIPEDA consent tracking)
- **Profile details** (first/last name, phone, location)

## Benefits to the Team

### ✅ **Atomic User Creation**
- **Problem Solved**: No race conditions between signup and profile completion
- **Before**: User created → multiple mutations → potential data inconsistency  
- **After**: Single atomic operation creates complete user profile

### ✅ **Frontend Simplicity** 
- **Problem Solved**: No complex onboarding state management
- **Before**: Track progress in database, handle partial saves, resumable flows
- **After**: Frontend collects data locally, submits once at the end

### ✅ **Type Safety & Validation**
- **Problem Solved**: Consistent validation at the auth boundary
- **Before**: Validation scattered across multiple mutations
- **After**: All validation happens in one place during user creation

### ✅ **Compliance by Design**
- **Problem Solved**: PIPA/PIPEDA consent must be captured during signup
- **Before**: Separate consent tracking, potential gaps
- **After**: Consent is mandatory part of user creation

## Frontend Developer Integration

### Simple 4-Step Process

#### Step 1: Collect Data Locally (No API Calls)
```tsx
// Frontend state management (React/Next.js)
const [onboardingData, setOnboardingData] = useState({
  // Step 1: Account type
  userType: "",
  
  // Step 2: Basic info  
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  phone: "",
  
  // Step 3: Legal needs
  legalAreas: [],
  urgencyLevel: "",
  legalMatterDescription: "",
  location: { city: "", province: "", postalCode: "" },
  
  // Step 4: Preferences
  meetingPreferences: [],
  lawyerGenderPreference: "",
  
  // Consent (required)
  termsAccepted: false,
  privacyAccepted: false,
  marketingConsent: false,
});
```

#### Step 2: Update State Per Step (No Database)
```tsx
function handleStep3Submit(data) {
  setOnboardingData(prev => ({
    ...prev,
    legalAreas: data.legalAreas,
    urgencyLevel: data.urgencyLevel,
    // ... other step 3 fields
  }));
  goToNextStep();
}
```

#### Step 3: Submit Everything at Once
```tsx
const { signIn } = useAuthActions();

async function completeOnboarding() {
  try {
    // This creates the user atomically with ALL data
    await signIn("password", onboardingData);
    // User is now fully created and logged in!
    router.push("/dashboard");
  } catch (error) {
    setError(error.message);
  }
}
```

#### Step 4: Handle Validation Errors
```tsx
// Provider validates all fields and returns clear errors:
// "Missing required fields: email, firstName, lastName, userType"  
// "Invalid userType. Must be: lawyer, end-user, or admin"
// "Invalid email format"
```

### Key Frontend Benefits

1. **No Database Calls During Onboarding** - Everything stays in local state
2. **Simple State Management** - Just a single object, no progress tracking
3. **One API Call** - `signIn("password", allData)` at the end
4. **Clear Error Handling** - Provider validates everything and gives specific errors
5. **No Partial States** - User either exists (complete) or doesn't exist

## API Layer vs Model Layer

### 🔓 **API Layer** (What Frontend Calls)
```ts
// Frontend only needs to know about this:
await signIn("password", {
  userType: "end-user",
  firstName: "John",
  lastName: "Doe",
  email: "john@example.com",
  password: "securePassword123",
  legalAreas: ["family-law"],
  urgencyLevel: "urgent",
  // ... all other onboarding data
});
```

### 🔒 **Model Layer** (Internal Business Logic)
```ts
// convex/auth/OnboardingPasswordProvider.ts
export default Password<DataModel>({
  profile(params, ctx) {
    // BUSINESS LOGIC STAYS HERE:
    
    // 1. Validation rules
    if (!validUserTypes.includes(userType)) {
      throw new Error("Invalid userType");
    }
    
    // 2. Data transformation
    const fullName = `${firstName} ${lastName}`;
    
    // 3. Compliance requirements  
    consent: {
      terms: true,
      privacy: true,
      version: "1.0",
      timestamp: Date.now(),
    },
    
    // 4. Default values
    privacyPrefs: {
      shareProfile: false, // Default to private
      allowAnalytics: true, // Default opt-in
    },
    
    // 5. Data structure mapping
    return completeUserProfile;
  }
});
```

## What This Means for Development

### ✅ **Frontend Team**
- **Simple integration** - One API call to learn
- **Local state only** - No database complexity  
- **Clear error messages** - Provider handles all validation
- **Type-safe** - TypeScript knows all required fields

### ✅ **Backend Team**
- **Business logic centralized** - All rules in one place
- **Easy to test** - Single function to test all validation
- **Compliance built-in** - PIPA/PIPEDA requirements enforced
- **Future-proof** - Easy to add new fields or validation rules

### ✅ **Team Coordination**
- **Clear contract** - Frontend knows exactly what data to collect
- **No coordination needed** - Backend handles all the complexity
- **Fast iteration** - Changes only require updating the provider function
- **Debugging simplified** - One place to check for user creation issues

## Migration Path

If you need to add new onboarding fields later:

1. **Add to schema** - New optional field
2. **Update provider** - Handle new field in profile function  
3. **Update frontend** - Add field to onboarding form
4. **Deploy** - No database migrations needed (optional fields)