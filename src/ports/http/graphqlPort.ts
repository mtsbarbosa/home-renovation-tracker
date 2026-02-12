import { createSchema as createGraphqlSchema } from 'graphql-yoga';
import { GraphQLError } from 'graphql';
import { getPing } from '../../controllers/pingController.js';
import { toGraphqlPingResult } from '../../adapters/ping.js';
import { getJobById, createJob, patchJob, deleteJob } from '../../controllers/jobsController.js';
import {
  canViewJob,
  canEditJobAsContractor,
  canCreateJobAsContractor,
} from '../../logic/jobsAuth.js';
import { v4 as uuidv4, validate as validateUuid } from 'uuid';
import { UserRole } from '../../models/user.js';

type GraphQLContext = { user: { userId: string; role: string } | null };

export function createGraphqlPort() {
  return createGraphqlSchema({
    typeDefs: `
      type Query {
        ping: PingResult!
        getJobById(id: ID!): Job!
      }

      type Mutation {
        createJob(input: CreateJobInput!): Result!
        patchJob(input: PatchJobInput!): Result!
        deleteJob(id: ID!): Result!
      }

      type PingResult {
        message: String!
        timestamp: String!
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
      }
    `,
    resolvers: {
      Query: {
        ping: async () => {
          const model = await getPing();
          return toGraphqlPingResult(model);
        },
        getJobById: async (_, { id }, context: GraphQLContext) => {
          if (!context.user) {
            throw new GraphQLError('Authentication required', {
              extensions: { code: 'UNAUTHENTICATED' },
            });
          }
          if (!validateUuid(id)) {
            throw new GraphQLError('Invalid job ID format', {
              extensions: { code: 'BAD_REQUEST' },
            });
          }
          const job = await getJobById(id);
          if (!job) {
            throw new GraphQLError('Job not found', {
              extensions: { code: 'NOT_FOUND' },
            });
          }
          if (!canViewJob(job, context.user.userId)) {
            throw new GraphQLError('Access denied', {
              extensions: { code: 'FORBIDDEN' },
            });
          }
          return job;
        },
      },
      Mutation: {
        createJob: async (_, { input }, context: GraphQLContext) => {
          if (!context.user || context.user.role !== UserRole.CONTRACTOR) {
            throw new GraphQLError('Contractor role required', {
              extensions: { code: 'FORBIDDEN' },
            });
          }
          if (!canCreateJobAsContractor(input.contractor_id, context.user.userId)) {
            throw new GraphQLError('Can only create jobs as yourself', {
              extensions: { code: 'FORBIDDEN' },
            });
          }
          const job = { id: uuidv4(), ...input };
          const result = await createJob(job);
          return result;
        },
        patchJob: async (_, { input }, context: GraphQLContext) => {
          if (!context.user || context.user.role !== UserRole.CONTRACTOR) {
            throw new GraphQLError('Contractor role required', {
              extensions: { code: 'FORBIDDEN' },
            });
          }
          const existing = await getJobById(input.id);
          if (!existing) {
            throw new GraphQLError('Job not found', {
              extensions: { code: 'NOT_FOUND' },
            });
          }
          if (!canEditJobAsContractor(existing, context.user.userId)) {
            throw new GraphQLError('Access denied', {
              extensions: { code: 'FORBIDDEN' },
            });
          }
          const result = await patchJob(input);
          return result;
        },
        deleteJob: async (_, { id }, context: GraphQLContext) => {
          if (!context.user || context.user.role !== UserRole.CONTRACTOR) {
            throw new GraphQLError('Contractor role required', {
              extensions: { code: 'FORBIDDEN' },
            });
          }
          const existing = await getJobById(id);
          if (!existing) {
            throw new GraphQLError('Job not found', {
              extensions: { code: 'NOT_FOUND' },
            });
          }
          if (!canEditJobAsContractor(existing, context.user.userId)) {
            throw new GraphQLError('Access denied', {
              extensions: { code: 'FORBIDDEN' },
            });
          }
          const result = await deleteJob(id);
          return result;
        },
      },
    },
  });
}
