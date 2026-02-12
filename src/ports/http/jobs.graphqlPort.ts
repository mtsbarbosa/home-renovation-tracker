import {
  getJobById,
  createJob,
  patchJob,
  deleteJob,
  getJobMessagesPaginated,
} from '../../controllers/jobsController.js';
import {
  canViewJob,
  canEditJobAsContractor,
  canCreateJobAsContractor,
} from '../../logic/jobsAuth.js';
import { v4 as uuidv4, validate as validateUuid } from 'uuid';
import { UserRole } from '../../models/user.js';
import {
  accessDenied,
  canOnlyCreateJobsAsYourself,
  contractorRoleRequired,
  invalidJobIdFormat,
  jobNotFound,
  unauthenticated,
} from './graphqlErrors.js';

export type GraphQLContext = { user: { userId: string; role: string } | null };

export const jobsTypeDefs = `
  extend type Query {
    getJobById(id: ID!): Job!
  }

  extend type Mutation {
    createJob(input: CreateJobInput!): Result!
    patchJob(input: PatchJobInput!): Result!
    deleteJob(id: ID!): Result!
  }

  type Result {
    id: ID,
    message: String
    error: String
    success: Boolean!
  }

  input CreateJobInput {
    description: String!
    location: String!
    cost: Float!
    contractor_id: ID!
    homeowner_id: ID
  }

  input PatchJobInput {
    id: ID!
    description: String
    location: String
    status: JobStatus
    cost: Float
    homeowner_id: ID
  }

  enum JobStatus {
    CREATED
    PLANNED
    IN_PROGRESS
    COMPLETED
    CANCELLED
    INVALID
  }

  type Job {
    id: ID!
    description: String!
    location: String!
    status: JobStatus!
    cost: Float!
    contractor_id: ID!
    homeowner_id: ID
    status_message: String
    created_at: String
    updated_at: String
    jobMessages(limit: Int, after: ID): JobMessagesConnection!
  }
`;

async function getJobIfValid(context: GraphQLContext, id: string): ReturnType<typeof getJobById> {
  if (!context.user) {
    unauthenticated();
  }
  if (!validateUuid(id)) {
    invalidJobIdFormat();
  }
  const job = await getJobById(id);
  if (!job) {
    jobNotFound();
  }
  if (!canViewJob(job!, context.user!.userId)) {
    accessDenied();
  }
  return job!;
}

function validateCreateJobInput(
  user: { userId: string; role: string } | null,
  input: { contractor_id: string }
): void {
  if (!user || user.role !== UserRole.CONTRACTOR) {
    contractorRoleRequired();
  }
  if (!canCreateJobAsContractor(input.contractor_id, user!.userId)) {
    canOnlyCreateJobsAsYourself();
  }
}

async function validatePatchJobInput(
  user: { userId: string; role: string } | null,
  input: { id: string }
): Promise<void> {
  if (!user || user.role !== UserRole.CONTRACTOR) {
    contractorRoleRequired();
  }
  if (!validateUuid(input.id)) {
    invalidJobIdFormat();
  }
  const existing = await getJobById(input.id);
  if (!existing) {
    jobNotFound();
  }
  if (!canEditJobAsContractor(existing!, user.userId)) {
    accessDenied();
  }
}

async function validateDeleteJobInput(
  user: { userId: string; role: string } | null,
  id: string
): Promise<void> {
  if (!user || user.role !== UserRole.CONTRACTOR) {
    contractorRoleRequired();
  }
  if (!validateUuid(id)) {
    invalidJobIdFormat();
  }
  const existing = await getJobById(id);
  if (!existing) {
    jobNotFound();
  }
  if (!canEditJobAsContractor(existing!, user.userId)) {
    accessDenied();
  }
}

export function createJobsResolvers() {
  return {
    Query: {
      getJobById: async (_: unknown, { id }: { id: string }, context: GraphQLContext) => {
        return getJobIfValid(context, id);
      },
    },
    Job: {
      jobMessages: async (
        parent: { id: string },
        args: { limit?: number; after?: string | null }
      ) => {
        const limit = args.limit ?? 10;
        return getJobMessagesPaginated(parent.id, limit, args.after);
      },
    },
    Mutation: {
      createJob: async (
        _: unknown,
        { input }: { input: Record<string, unknown> },
        context: GraphQLContext
      ) => {
        const user = context.user;
        validateCreateJobInput(user, input as { contractor_id: string });

        const job = { id: uuidv4(), ...input };
        return createJob(job as Parameters<typeof createJob>[0]);
      },
      patchJob: async (
        _: unknown,
        { input }: { input: { id: string } },
        context: GraphQLContext
      ) => {
        const user = context.user;
        await validatePatchJobInput(user, input);
        return patchJob(input as Parameters<typeof patchJob>[0]);
      },
      deleteJob: async (_: unknown, { id }: { id: string }, context: GraphQLContext) => {
        const user = context.user;
        await validateDeleteJobInput(user, id);
        return deleteJob(id);
      },
    },
  };
}
