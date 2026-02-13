import { createSchema as createGraphqlSchema, createPubSub } from 'graphql-yoga';
import type { JobMessage } from '../../models/jobMessage.js';
import { jobsTypeDefs, createJobsResolvers } from './jobs.graphqlPort.js';
import { jobMessagesTypeDefs, createJobMessagesResolvers } from './jobMessages.graphqlPort.js';

const pubSub = createPubSub<{
  jobMessages: [jobId: string, payload: JobMessage];
}>();

const baseTypeDefs = `
  type Query {
    _placeholder: Boolean
  }

  type Mutation {
    _placeholder: Boolean
  }

  type Subscription {
    _placeholder: Boolean
  }
`;

export function createGraphqlPort() {
  return createGraphqlSchema({
    typeDefs: [baseTypeDefs, jobsTypeDefs, jobMessagesTypeDefs],
    resolvers: [createJobsResolvers(), createJobMessagesResolvers(pubSub)],
  });
}
