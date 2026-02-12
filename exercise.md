# Take-Home Challenge: Backend Engineer

👋 Welcome!

Thank you for your interest in our Senior Backend Engineering position!

This exercise will help us assess your backend design skills, API implementation, and ability to reason about data consistency and system behavior over time.

# **What We’re Looking For**

We don’t expect you to know every piece of our stack. We do expect:

- Strong backend architecture and database design.
- Ability to implement clean, consistent APIs.
- Consideration of tradeoffs, scalability, and maintainability.

# **Our Stack**

You may choose your language and frameworks, but we suggest:

- Language: Node (TypeScript) or Python
- Database: PostgreSQL (with an ORM or query builder of your choice)
- API: GraphQL (preferred) or REST

Optional extras if you want to use them: Redis, queues, or AWS services.

# **Using AI**

⚡ We’re an AI company. Use AI tools as much as you like.

However:

- You must fully understand your solution.
- Be prepared to explain your design decisions and how you used AI.

# **The Challenge: Home Renovation Project Tracker**

You will build the backend system for a tool that allows contractors and homeowners to collaborate on renovation projects.

**Core Requirements**

Contractor Capabilities:

- Login (hardcoded username + password is fine).
- CRUD jobs.
- Add homeowners to jobs.

Homeowner Capabilities:

- Login.
- View the status of their job.

Job Information should include:

- Description
- Location (address)
- Status: planning, in progress, completed, canceled
- Cost (editable by contractor)
- Messages (chat-like log between contractor and homeowner)

Deliverable:

- Expose API endpoints (GraphQL or REST) that support the above workflows.
- Persist data in a relational database.
- No frontend required — usage examples via Postman collection, curl commands, or GraphQL Playground are enough.

# **🔥 Required Advanced Feature: History + Undo/Redo**

In addition to the basic CRUD features, implement a history system for jobs:

- Track all changes to jobs (description, cost, status, etc.).
- Provide undo and redo operations for contractors.
- Homeowners can only view history (read-only).

⚠️ Be ready to discuss:

- How you modeled history in the database.
- Your strategy for undo/redo (event sourcing, snapshots, versioning, etc.).
- How you ensured data integrity.

# **Optional Advanced Features (Choose One)**

Extend your backend by adding one of these features:

- Real-time messaging: Simulated or actual live contractor ↔ homeowner messaging.
- Sub-tasks: Each job can contain subtasks with description, deadline, and cost.
- Sub-contractors: CRUD subcontractors and assign them to jobs.

# **Deliverables**

**1. Code**

- A **public GitHub repository** containing your backend solution.
- **At least two Pull Requests**:
    - **PR #1:** Core features
    - **PR #2:** History + optional advanced feature

**2. Documentation**

- A **README** that includes:
    - Setup and run instructions
    - API usage examples (e.g. curl, Postman, GraphQL queries/mutations)
    - Key assumptions, risks or technical tradeoffs made
    - **Optional**: Include a brief note about which AI tools you used and how they helped your workflow.

**3. Video Walkthrough (≤15 minutes)**

- A short walkthrough covering:
    - Overall architecture
    - Key technical decisions and tradeoffs
    - How the solution addresses the problem
    - What you would improve or extend with more time

✅ That’s it! Please send us your repo link when you’re done.