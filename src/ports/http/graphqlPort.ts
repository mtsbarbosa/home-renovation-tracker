import { createSchema as createGraphqlSchema, createPubSub } from 'graphql-yoga';
import { getPing } from '../../controllers/pingController.js';
import { toGraphqlPingResult } from '../../adapters/ping.js';
import type { JobMessage } from '../../models/jobMessage.js';
import { jobsTypeDefs, createJobsResolvers } from './jobs.graphqlPort.js';
import { jobMessagesTypeDefs, createJobMessagesResolvers } from './jobMessages.graphqlPort.js';

const pubSub = createPubSub<{
  jobMessages: [jobId: string, payload: JobMessage];
}>();

const baseTypeDefs = `
  type Query {
    ping: PingResult!
  }

  type Mutation {
    _placeholder: Boolean
  }

  type Subscription {
    _placeholder: Boolean
  }

  type PingResult {
    message: String!
    timestamp: String!
  }
`;

export function createGraphqlPort() {
  return createGraphqlSchema({
    typeDefs: [baseTypeDefs, jobsTypeDefs, jobMessagesTypeDefs],
    resolvers: [
      {
        Query: {
          ping: async () => {
            const model = await getPing();
            return toGraphqlPingResult(model);
          },
        },
      },
      createJobsResolvers(),
      createJobMessagesResolvers(pubSub),
    ],
  });
}
