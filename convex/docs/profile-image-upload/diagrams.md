# Profile Image Upload - Visual Diagrams

This document contains visual diagrams that illustrate the complete profile image upload system architecture, flow, and error handling strategies.

## 1. Upload Sequence Diagram

**Complete User Flow from File Selection to Image Display**

![Upload Sequence Diagram](https://hallowed-ptarmigan-685.convex.cloud/api/storage/f401b458-c367-46b1-b173-07b0427702b5)

This sequence diagram shows the complete user journey for uploading a profile image:

### Key Flow Steps:
1. **File Selection & Validation** - User selects image, frontend validates file type and size
2. **Upload URL Generation** - Frontend requests temporary upload URL from Convex API
3. **Direct Storage Upload** - File uploads directly to Convex Storage (bypasses backend)
4. **Profile Update** - User profile updated with storage ID through API and model layer
5. **Image Display** - Public URL generated for displaying the uploaded image

### Architecture Highlights:
- **🔐 Authentication**: Required for all mutations, secure user ownership validation
- **⚡ Performance**: Direct storage upload optimizes speed and reduces server load
- **🏗️ Clean Architecture**: Clear separation between API layer and business logic model
- **🛡️ Security**: Storage IDs remain private, public URLs safe for display

---

## 2. Error Handling Strategy

**Comprehensive Error Scenarios and Recovery Paths**

![Error Handling Flow](https://hallowed-ptarmigan-685.convex.cloud/api/storage/e397560c-2caf-4dcc-b4a7-89223f590f8c)

This diagram maps all possible error scenarios and their recovery strategies:

### Error Categories:
- **📁 File Validation Errors** - Invalid file type, size limits, corrupt files
- **🔐 Authentication Errors** - Expired sessions, unauthorized access
- **🌐 Network Errors** - Connection failures, timeouts, upload interruptions
- **💾 Storage Errors** - Quota exceeded, storage system failures
- **🗄️ Database Errors** - Profile update failures, user not found

### Recovery Strategies:
- **🔄 Automatic Retry** - For transient network/server issues
- **👤 User-Initiated Retry** - Clear error messages with retry buttons  
- **🔒 Authentication Recovery** - Redirect to login while preserving state
- **📝 Graceful Degradation** - Core functionality works even with partial failures

---

## 3. System Architecture

**Component Relationships and Data Flow**

![Architecture Diagram](https://hallowed-ptarmigan-685.convex.cloud/api/storage/61bd319b-61aa-4ea4-8e4b-f0509f485a9e)

This component diagram illustrates the system architecture and relationships:

### Architecture Layers:
1. **Frontend Layer** - React components, file validation, upload UI, error handling
2. **API Layer** - Minimal frontend-exposed endpoints following Convex best practices
3. **Model Layer** - Business logic functions, database operations, validation rules
4. **Infrastructure Layer** - Convex Storage system, database, CDN distribution

### Key Design Patterns:
- **🎯 Separation of Concerns** - Each layer has distinct responsibilities
- **🔒 Security First** - Authentication middleware and permission checks
- **📦 Minimal API Surface** - Only essential endpoints exposed to frontend
- **🏗️ Reusable Business Logic** - Model layer functions can be shared across APIs

### Data Flow:
1. **Upload Request** → Frontend validates → API generates URL
2. **File Upload** → Direct to storage → Returns storage ID
3. **Profile Update** → API → Model layer → Database
4. **Image Display** → Query API → Storage URL → CDN delivery

---

## Implementation Notes

### For Frontend Developers:
- Use the **sequence diagram** to understand the complete API integration flow
- Reference the **error handling diagram** to implement proper error states and recovery
- Follow the **architecture diagram** to understand component boundaries and responsibilities

### For Backend Developers:
- The **architecture diagram** shows the model layer separation and business logic placement
- The **sequence diagram** illustrates the authentication checkpoints and security measures
- The **error handling diagram** guides comprehensive error response design

### For QA/Testing:
- The **error handling diagram** provides a comprehensive test case matrix
- The **sequence diagram** shows all integration points that need testing
- The **architecture diagram** identifies component boundaries for unit vs integration testing

These diagrams serve as living documentation that should be updated as the feature evolves.