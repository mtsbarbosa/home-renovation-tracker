import { GraphQLError } from 'graphql';

export function jobNotFound(): never {
  throw new GraphQLError('Job not found', {
    extensions: { code: 'NOT_FOUND' },
  });
}

export function accessDenied(): never {
  throw new GraphQLError('Access denied', {
    extensions: { code: 'FORBIDDEN' },
  });
}

export function jobMustHaveHomeowner(): never {
  throw new GraphQLError('Job must have a homeowner to add messages', {
    extensions: { code: 'BAD_REQUEST' },
  });
}

export function recipientMustBeContractorOrHomeowner(): never {
  throw new GraphQLError('Recipient must be the contractor or homeowner of the job', {
    extensions: { code: 'BAD_REQUEST' },
  });
}

export function invalidJobIdFormat(): never {
  throw new GraphQLError('Invalid job ID format', {
    extensions: { code: 'BAD_REQUEST' },
  });
}

export function messageCannotBeEmpty(): never {
  throw new GraphQLError('Message cannot be empty', {
    extensions: { code: 'BAD_REQUEST' },
  });
}

export function unauthenticated(): never {
  throw new GraphQLError('Authentication required', {
    extensions: { code: 'UNAUTHENTICATED' },
  });
}

export function contractorRoleRequired(): never {
  throw new GraphQLError('Contractor role required', {
    extensions: { code: 'FORBIDDEN' },
  });
}

export function canOnlyCreateJobsAsYourself(): never {
  throw new GraphQLError('Can only create jobs as yourself', {
    extensions: { code: 'FORBIDDEN' },
  });
}
