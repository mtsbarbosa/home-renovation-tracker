---

## Change Log

### 2024-02-11: Base project setup

- **Stack:** TypeScript, pnpm, Express, GraphQL Yoga, Knex, PostgreSQL
- **Structure:** Minimal layout — `src/` with `db/`, `graphql/`, entry `index.ts`
- **GraphQL:** Dummy `ping` query returning `{ message, timestamp }`
- **Docker:** `Dockerfile` + `docker-compose.yml` (app + postgres in one `docker compose up`)
- **Database:** Knex config (`knexfile.cjs`), init migration (uuid-ossp extension), `.cjs` migrations for ESM compatibility
- **Tooling:** ESLint (flat config), Prettier, Vitest
- **Tests:** Unit test for ping query via GraphQL Yoga fetch

### 2024-02-11: Hexagonal architecture refactor

- **Layout:** `models/`, `logic/`, `ports/`, `adapters/`, `controllers/`
- **GraphQL as port:** Moved to `ports/http/graphqlPort.ts` (HTTP incoming port)
- **Ping flow:** Model → Logic (createPingResult) → Controller → Port resolver → Adapter (toGraphqlPingResult)
- **Unit tests:** logic/ping, adapters/ping
- **Integration test:** ports/http/graphqlPort (GraphQL resolver via controller + adapter)

### Jobs CRUD + GraphQL

- **GraphQL:** getJobById (query), createJob, patchJob, deleteJob (mutations)
- **ports/sql/jobsPort.out.ts:** getJobById, createJob, patchJob, deleteJob (Knex)
- **controllers/jobsController:** Glues jobsPort.out
- **Migration:** 20240211000003_jobs.cjs (jobs + job_messages tables)
- **Integration tests:** jobs.graphql.test.ts (getJobById, createJob, patchJob, deleteJob with mocked jobsPort.out)

### Auth + validation

- **Auth port:** signin, signup, signout at /auth
- **Input validation:** In ports (authPort.in), not controllers
- **JWT_SECRET:** Env var, documented in README + .env.example

### Jobs validation + adapters

- **adapters/jobsAdapter.ts:** Pure `validateJobForCreate`, `validateJobForPatch`; orchestration via `prepareJobForCreate`, `prepareJobForPatch`
- **Validation:** Contractor/homeowner must exist and have correct role; invalid jobs are stored with `status: INVALID` and `status_message`
- **status_message:** Cleared when valid, set when invalid; migration 20240212000001_add_job_status_msg.cjs

### Jobs auth + ownership

- **logic/jobsAuth.ts:** Pure `canViewJob`, `canEditJobAsContractor`, `canCreateJobAsContractor`
- **JWT:** Includes `userId` and `role`; middleware `extractUser` validates token; GraphQL context extracts user from `Authorization`
- **Ownership:** getJobById — user must be contractor or homeowner; createJob — contractor_id must match user; patchJob/deleteJob — contractor must own job
- **types/express.d.ts:** Augments `Express.Request` with `user`

### Misc

- **Migrations:** Renamed to 20240211000001_init.cjs, 20240211000002_users_and_tenancy.cjs (CommonJS)
- **.gitignore:** node_modules, dist, .env, coverage, IDE, OS files
- **README:** Curl examples for Auth API + GraphQL (ping, jobs CRUD)