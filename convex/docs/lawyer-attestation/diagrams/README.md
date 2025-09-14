# Lawyer Attestation - PlantUML Diagrams

This directory contains professional PlantUML diagrams that visualize the complete lawyer attestation system architecture, flows, and security patterns.

## 🎨 Visual Style Guide

All diagrams use a consistent **Professional Light Theme** with:
- **Clean typography**: Segoe UI font family
- **Consistent colors**: Blue primary (#0066cc), green success (#28a745), amber warnings (#856404)
- **Structured layout**: Clear separation of concerns and logical flow
- **Professional aesthetics**: Rounded corners, proper spacing, visual hierarchy

## 📊 Available Diagrams

### 1. Attestation Sequence Diagram
**File**: `attestation-sequence-diagram.puml`  
**Purpose**: Complete end-to-end user flow from form submission to success

**Shows**:
- User interaction with attestation form
- Frontend validation and error handling
- API authentication and authorization
- LSA verification process
- Database storage and audit logging
- Success confirmation flow

**Use for**: Understanding the complete API integration flow

### 2. Error Handling Flow
**File**: `error-handling-flow.puml`  
**Purpose**: Comprehensive error scenarios and recovery strategies

**Shows**:
- Frontend validation errors and recovery
- Authentication failures and redirects  
- LSA service outages and fallbacks
- Database errors and retry logic
- User experience during error states

**Use for**: Building robust error handling and testing error scenarios

### 3. Architecture Component Diagram
**File**: `architecture-component-diagram.puml`  
**Purpose**: System architecture and component relationships

**Shows**:
- Frontend layer components and responsibilities
- API layer design and endpoints
- Business logic layer separation
- Database schema and relationships
- Security integration points

**Use for**: Understanding system architecture and component boundaries

### 4. Security Flow Diagram  
**File**: `security-flow-diagram.puml`  
**Purpose**: Multi-layer security and authentication flow

**Shows**:
- Authentication checkpoints and session management
- Role-based authorization layers
- Row-level security enforcement
- Input validation and sanitization
- Audit logging and compliance features

**Use for**: Security review and compliance verification

## 🛠️ How to Use These Diagrams

### For Frontend Developers
1. **Start with sequence diagram** - understand the complete API flow
2. **Review error handling** - implement proper error states and recovery
3. **Check architecture diagram** - understand component responsibilities
4. **Reference security flow** - implement proper authentication patterns

### For Backend Developers  
1. **Architecture diagram** - shows model layer separation and database design
2. **Sequence diagram** - illustrates authentication checkpoints and validation
3. **Security flow** - guides comprehensive security implementation
4. **Error handling** - ensures robust error response design

### For QA/Testing
1. **Error handling diagram** - provides comprehensive test case matrix
2. **Security flow** - shows all security checkpoints that need testing
3. **Sequence diagram** - identifies all integration points for testing
4. **Architecture diagram** - guides unit vs integration testing approach

### For Product/Compliance
1. **Sequence diagram** - shows user experience flow
2. **Security flow** - demonstrates compliance features (audit, verification)
3. **Error handling** - shows graceful failure and recovery paths
4. **Architecture** - explains system reliability and scalability

## 🎯 Rendering the Diagrams

### Using PlantUML Online
1. Visit [plantuml.com/plantuml](http://www.plantuml.com/plantuml)
2. Copy and paste the `.puml` file contents
3. Click "Submit" to generate the diagram
4. Download as PNG/SVG for documentation

### Using VS Code Extension
1. Install "PlantUML" extension by jebbs
2. Open any `.puml` file
3. Press `Alt+D` to preview
4. Use `Ctrl+Shift+P` → "PlantUML: Export Current Diagram" to save

### Using Command Line
```bash
# Install PlantUML
npm install -g plantuml

# Generate all diagrams
plantuml *.puml

# Generate specific diagram
plantuml attestation-sequence-diagram.puml
```

### Using Docker
```bash
# Generate all diagrams using Docker
docker run --rm -v $(pwd):/work plantuml/plantuml *.puml
```

## 🔄 Diagram Maintenance

### When to Update
- ✅ New API endpoints added
- ✅ Security model changes
- ✅ Error handling improvements
- ✅ Architecture refactoring
- ✅ External integration changes

### Update Checklist
- [ ] Update relevant diagram(s)
- [ ] Regenerate PNG/SVG files
- [ ] Update documentation references
- [ ] Review with stakeholders
- [ ] Commit changes to repository

## 📝 Diagram Conventions

### Icons & Symbols
- **⚖️** = Lawyer/Legal context
- **🔒** = Authentication required
- **🎭** = Role-based authorization  
- **🏛️** = Law Society Alberta integration
- **📋** = Audit logging
- **💾** = Database operations
- **🚨** = Error conditions
- **✅** = Success states

### Color Coding
- **Blue** = Primary actions and components
- **Green** = Success states and positive flows
- **Amber** = Warnings and caution states
- **Red** = Errors and blocked states
- **Purple** = Security and compliance features

### Flow Direction
- **Top to bottom** = Temporal sequence
- **Left to right** = Data flow
- **Grouped boxes** = Logical layers
- **Dotted lines** = Optional or conditional flows

---

**💡 Pro Tip**: These diagrams are living documentation. Keep them updated as the system evolves to maintain their value for onboarding, debugging, and system understanding!