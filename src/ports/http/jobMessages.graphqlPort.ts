import { addJobMessage } from '../../controllers/jobsController.js';
import { getJobById } from '../../controllers/jobsController.js';
import { canAddMessageToJob, canViewJob, isValidMessageRecipient } from '../../logic/jobsAuth.js';
import type { JobMessage } from '../../models/jobMessage.js';
import { v4 as uuidv4, validate as validateUuid } from 'uuid';
import {
  accessDenied,
  invalidJobIdFormat,
  jobMustHaveHomeowner,
  jobNotFound,
  messageCannotBeEmpty,
  recipientMustBeContractorOrHomeowner,
  unauthenticated,
} from './graphqlErrors.js';
import type { GraphQLContext } from './jobs.graphqlPort.js';

export const jobMessagesTypeDefs = `
  extend type Mutation {
    addJobMessage(input: AddJobMessageInput!): JobMessage!
  }

  extend type Subscription {
    jobMessages(jobId: ID!): JobMessage!
  }

  type JobMessagesConnection {
    messages: [JobMessage!]!
    hasMore: Boolean!
  }

  type JobMessage {
    id: ID!
    job_id: ID!
    author_id: ID!
    recipient_id: ID!
    message: String!
    created_at: String!
  }

  input AddJobMessageInput {
    job_id: ID!
    recipient_id: ID!
    message: String!
  }
`;

async function validateAddJobMessageInput(
  user: { userId: string; role: string } | null,
  input: { job_id: string; recipient_id: string; message: string }
): Promise<void> {
  if (!user) {
    unauthenticated();
  }
  if (!validateUuid(input.job_id)) {
    invalidJobIdFormat();
  }
  if (!input.message?.trim()) {
    messageCannotBeEmpty();
  }
  const job = await getJobById(input.job_id);
  if (!job) {
    jobNotFound();
  }
  if (!canAddMessageToJob(job!, user!.userId)) {
    accessDenied();
  }
  if (!job!.homeowner_id) {
    jobMustHaveHomeowner();
  }
  if (!isValidMessageRecipient(job!, user!.userId, input.recipient_id)) {
    recipientMustBeContractorOrHomeowner();
  }
}

function validateJobMessagesSubscriptionInput(
  user: { userId: string; role: string } | null,
  jobId: string
): void {
  if (!user) {
    unauthenticated();
  }
  if (!validateUuid(jobId)) {
    invalidJobIdFormat();
  }
}

export function createJobMessagesResolvers(pubSub: {
  publish: (topic: 'jobMessages', jobId: string, payload: JobMessage) => void;
  subscribe: (topic: 'jobMessages', jobId: string) => AsyncIterable<JobMessage>;
}) {
  return {
    Mutation: {
      addJobMessage: async (
        _: unknown,
        { input }: { input: { job_id: string; recipient_id: string; message: string } },
        context: GraphQLContext
      ) => {
        const user = context.user;
        await validateAddJobMessageInput(user, input);

        const msg: JobMessage = {
          id: uuidv4(),
          job_id: input.job_id,
          author_id: user!.userId,
          recipient_id: input.recipient_id,
          message: input.message.trim(),
          created_at: new Date(),
        };
        const inserted = await addJobMessage(msg);
        pubSub.publish('jobMessages', input.job_id, inserted);
        return inserted;
      },
    },
    Subscription: {
      jobMessages: {
        subscribe: async (_: unknown, { jobId }: { jobId: string }, context: GraphQLContext) => {
          const user = context.user;
          validateJobMessagesSubscriptionInput(user, jobId);

          if (!user) {
            unauthenticated();
          }
          const job = await getJobById(jobId);
          if (!job) {
            jobNotFound();
          }
          if (!canViewJob(job, user.userId)) {
            accessDenied();
          }
          return pubSub.subscribe('jobMessages', jobId);
        },
        resolve: (payload: JobMessage) => payload,
      },
    },
  };
}
