# Home Renovation Tracker

Backend service for contractors and homeowners to collaborate on renovation projects.

## Architecture (Hexagonal)

- **models/** — Core schemas (pure types, no logic)
- **logic/** — Business rules as pure functions (unit-testable)
- **ports/** — Boundaries to external systems:
  - `http/` — GraphQL API (incoming)
  - `schemas/` — Port boundary shapes
  - `sql/` — Database queries (outgoing)
- **adapters/** — Convert model ↔ port schema; job validation (validateJobForCreate/validateJobForPatch)
- **controllers/** — Glue logic and ports; ports do not call each other
- **logic/** — Pure, unit-testable functions (e.g. jobsAuth, authLogic)

Flow: `Port (GraphQL) → Controller → Logic/Adapter`; Controller orchestrates; Adapter validates and converts; Logic holds pure rules.

Job mutations are not blocking, so the api user will just receive an id, and a message that the insert / update / delete is ongoing. Since mid-heavy operations such as rolling back history might come, I took the decision blocking as few as possible user operations.

## Tech Stack

- **Runtime:** Node.js 20+
- **Language:** TypeScript
- **API:** GraphQL (graphql + Express)
- **Database:** PostgreSQL (Knex query builder)
- **Package manager:** pnpm

## Setup

### Prerequisites

- Node.js 20+
- pnpm
- Docker & Docker Compose

### Local development (without Docker)

```bash
pnpm install

# Start Postgres (or use existing instance)
# Default connection: postgres://app:appsecret@localhost:5432/home_renovation
# Optional: copy .env.example to .env and set JWT_SECRET

pnpm db:migrate
pnpm dev
```

### Run with Docker (single command)

```bash
# Set JWT_SECRET for production (or it defaults to a dev placeholder)
JWT_SECRET=your-secret docker compose up --build
```

- App: http://localhost:3000
- GraphQL Playground: http://localhost:3000/graphql
- Health check: http://localhost:3000/health

### Development with Docker (hot reload)

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

### Access PostgreSQL inside Docker

With the stack running (`docker compose up`), connect to the database:

```bash
docker compose exec db psql -U app -d home_renovation
```

Or from the host (if `psql` is installed):

```bash
psql -h localhost -p 5432 -U app -d home_renovation
# Password: appsecret
```

Connection string: `postgres://app:appsecret@localhost:5432/home_renovation`

## Scripts

| Script          | Description                      |
| --------------- | ---------------------------------|
| `pnpm dev`      | Start dev server with hot reload |
| `pnpm build`    | Compile TypeScript               |
| `pnpm start`    | Run compiled app                 |
| `pnpm db:migrate` | Run migrations                 |
| `pnpm test`     | Run tests                        |
| `pnpm lint`     | Run ESLint                       |
| `pnpm format`   | Format code with Prettier        |

## Auth API

**Sign up:**
```bash
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"john.doe@example.com","password":"123", "name": "John Doe", "role": "homeowner"}'
```

**Sign in:**
```bash
curl -X POST http://localhost:3000/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"john.doe@example.com","password":"123"}'
```

**Sign out:**
```bash
curl -X POST http://localhost:3000/auth/signout \
  -H "Content-Type: application/json" \
  -d '{"token":"<jwt-from-signin-response>"}'
```

## GraphQL API

All GraphQL requests go to `POST http://localhost:3000/graphql` with `Content-Type: application/json`.

**Authentication:** Job queries and mutations require a valid JWT. Include the token in the `Authorization` header:

```
Authorization: Bearer <jwt-from-signin-response>
```

- **getJobById** — Contractor or homeowner; user must be the job’s contractor or homeowner
- **createJob** — Contractor only; `contractor_id` must match the authenticated user
- **patchJob, deleteJob** — Contractor only; user must be the job’s contractor

**Ping:**

*Playground:*
```graphql
query {
  ping {
    message
    timestamp
  }
}
```

*curl:*
```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"query { ping { message timestamp } }"}'
```

**Get job by ID:**

*Playground:*
```graphql
query GetJob($id: ID!) {
  getJobById(id: $id) {
    id
    description
    location
    status
    cost
    contractor_id
    homeowner_id
    status_message
  }
}
```
*Variables:* `{ "id": "<job-uuid>" }`

*curl:*
```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt-token>" \
  -d '{"query":"query GetJob($id: ID!) { getJobById(id: $id) { id description location status cost contractor_id homeowner_id status_message } }","variables":{"id":"<job-uuid>"}}'
```

**Create job:**

*Playground:*
```graphql
mutation CreateJob($input: CreateJobInput!) {
  createJob(input: $input) {
    id
    message
    success
  }
}
```
*Variables:*
```json
{
  "input": {
    "description": "Kitchen remodel",
    "location": "123 Main St",
    "cost": 5000,
    "contractor_id": "<your-contractor-uuid>",
    "homeowner_id": "<homeowner-uuid>"
  }
}
```
Note: `contractor_id` must match the authenticated user.

*curl:*
```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt-token>" \
  -d '{"query":"mutation CreateJob($input: CreateJobInput!) { createJob(input: $input) { id message success } }","variables":{"input":{"description":"Kitchen remodel","location":"123 Main St","cost":5000,"contractor_id":"<contractor-uuid>","homeowner_id":"<homeowner-uuid>"}}}'
```

**Patch job:**

*Playground:*
```graphql
mutation PatchJob($input: PatchJobInput!) {
  patchJob(input: $input) {
    id
    message
    success
  }
}
```
*Variables:*
```json
{
  "input": {
    "id": "<job-uuid>",
    "cost": 1750
  }
}
```

*curl:*
```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt-token>" \
  -d '{"query":"mutation PatchJob($input: PatchJobInput!) { patchJob(input: $input) { id message success } }","variables":{"input":{"id":"<job-uuid>","cost":1750}}}'
```

**Delete job:**

*Playground:*
```graphql
mutation DeleteJob($id: ID!) {
  deleteJob(id: $id) {
    id
    message
    success
  }
}
```
*Variables:* `{ "id": "<job-uuid>" }`

*curl:*
```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt-token>" \
  -d '{"query":"mutation DeleteJob($id: ID!) { deleteJob(id: $id) { id message success } }","variables":{"id":"<job-uuid>"}}'
```

GraphQL Playground: http://localhost:3000/graphql
