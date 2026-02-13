# Home Renovation Tracker

Backend service for contractors and homeowners to collaborate on renovation projects.

## AI Used
- Cursor + Composer 1.5 model mode (IDE + chat + completions)
- Check `.cursor/rules` and `context.md` for more details

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

**Technical details**:
Job mutations are not blocking, so the api user will just receive an id, and a message that the insert / update / delete is ongoing. Since mid-heavy operations such as rolling back history might come, I took the decision blocking as few as possible user operations.

**To consider for the future**:
- Jobs + JobMessages caching, it would be a nice adding caching them as soon as the scale gets really big (~1MM to ~3MM users/min across all instances so the postgres dont get overload) or optionally, adding read replicas instead;
- If writting jobs / messages gets higher than ~30,000 writes/s we could take advantage of the async operations to queue jobs to be inserted in bulks keeping write limits under control;
- Add winston or any other log library and output proper logs, specially on the important exception catches
- Add prom-client and expose /metrics and default node metrics for observability
- Add forget password, e-mail activation feature for auth. If the system grows auth can be extracted to another service with different provisioning.

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

Only db with docker:
```bash
# Set JWT_SECRET for production (or it defaults to a dev placeholder)
JWT_SECRET=your-secret docker compose up --build db
```

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
| `pnpm script:subscribe` | Login both users, run 2 subscriptions, exchange 2 messages each |
| `pnpm script:scrape-messages` | Paginate and print all job messages |

### Demo scripts (subscribe + scrape)

Scripts use `scripts/.script-config.json` for defaults and tokens (gitignored). Created automatically from `.script-config.example.json` on first run. Ensure users exist (signup with contractor/homeowner roles) and a job with both assigned.

```bash
cp scripts/.script-config.example.json scripts/.script-config.json
```

**Subscribe and exchange messages:**

```bash
./scripts/subscribe-and-message.sh
# Or with args: ./scripts/subscribe-and-message.sh [contractor_email] [contractor_pass] [homeowner_email] [homeowner_pass] [job_id]
```

**Scrape messages (paginated):**

```bash
./scripts/scrape-messages.sh
# Or: ./scripts/scrape-messages.sh [job_id]
```

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

- **getJobById** — Contractor or homeowner; user must be the job’s contractor or homeowner; includes `jobMessages`
- **createJob** — Contractor only; `contractor_id` must match the authenticated user
- **patchJob, deleteJob** — Contractor only; user must be the job’s contractor
- **addJobMessage** — Contractor or homeowner; user must be on the job; recipient must be the other party
- **jobMessages** (subscription) — Real-time messages per job; user must have access to the job

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
    jobMessages(limit: 10) {
      messages { id author_id recipient_id message created_at }
      hasMore
    }
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

**Add job message:**

*Playground:*
```graphql
mutation AddJobMessage($input: AddJobMessageInput!) {
  addJobMessage(input: $input) {
    id
    job_id
    author_id
    recipient_id
    message
    created_at
  }
}
```
*Variables:*
```json
{
  "input": {
    "job_id": "<job-uuid>",
    "recipient_id": "<contractor-or-homeowner-uuid>",
    "message": "Progress update: drywall is done."
  }
}
```
Note: Author must be contractor or homeowner on the job. Recipient must be the other party. Job must have a homeowner.

**Job messages pagination (load more):**

First page (omit `after`):
```graphql
query GetJobMessages($id: ID!) {
  getJobById(id: $id) {
    id
    jobMessages(limit: 10) {
      messages { id message author_id created_at }
      hasMore
    }
  }
}
```
*Variables:* `{ "id": "<job-uuid>" }`

Next page (pass `after` = id of last message from previous response):
```graphql
query GetJobMessages($id: ID!, $after: ID) {
  getJobById(id: $id) {
    id
    jobMessages(limit: 10, after: $after) {
      messages { id message author_id created_at }
      hasMore
    }
  }
}
```
*Variables:* `{ "id": "<job-uuid>", "after": "<last-message-id>" }`

*curl (load more):*
```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt-token>" \
  -d '{"query":"query GetJobMessages($id: ID!, $after: ID) { getJobById(id: $id) { id jobMessages(limit: 10, after: $after) { messages { id message author_id created_at } hasMore } } }","variables":{"id":"<job-uuid>","after":"<last-message-id>"}}'
```

**Job messages subscription (SSE):**

Subscriptions use Server-Sent Events. Use `graphql-sse` client or:

```bash
curl -N -H "Accept: text/event-stream" \
  -H "Authorization: Bearer <jwt-token>" \
  "http://localhost:3000/graphql?query=subscription%20JobMessages($jobId:%20ID!)%20%7B%20jobMessages(jobId:%20$jobId)%20%7B%20id%20message%20author_id%20created_at%20%7D%20%7D&variables=%7B%22jobId%22:%22%3Cjob-uuid%3E%22%7D"
```
