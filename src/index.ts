import express from 'express';
import { createYoga } from 'graphql-yoga';
import { createGraphqlPort } from './ports/http/graphqlPort.js';
import { createAuthPortInRoutes } from './ports/http/authPort.in.js';
import { extractUser, extractUserFromToken } from './middleware/auth.js';

const PORT = Number(process.env.PORT) || 3000;
const app = express();

const yoga = createYoga({
  schema: createGraphqlPort(),
  graphiql: true,
  context: ({ request }) => {
    const authHeader = request.headers.get('authorization');
    const user = extractUserFromToken(authHeader);
    return { user };
  },
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/graphql', extractUser, yoga);
app.use('/auth', createAuthPortInRoutes());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`GraphQL Playground at http://localhost:${PORT}/graphql`);
});
