import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createYoga } from 'graphql-yoga';
import { createGraphqlPort } from './graphqlPort.js';
import * as jobsPortOut from '../sql/jobsPort.out.js';
import * as authPortOut from '../sql/authPort.out.js';
import { extractUserFromToken } from '../../middleware/auth.js';
import { generateToken } from '../../logic/authLogic.js';
import { JobStatus } from '../../models/job.js';
import { UserRole } from '../../models/user.js';

vi.mock('../sql/jobsPort.out.js');
vi.mock('../sql/authPort.out.js');
vi.mock('../../config.js', () => {
  const cfg = { jwtSecret: 'test-secret' };
  return { default: cfg, config: cfg };
});

const contractorToken = generateToken({
  id: 'contractor-1',
  email: 'c@test.com',
  password_hash: 'hash',
  name: 'C',
  role: UserRole.CONTRACTOR,
  created_at: new Date(),
  updated_at: new Date(),
});

const homeownerToken = generateToken({
  id: 'homeowner-1',
  email: 'h@test.com',
  password_hash: 'hash',
  name: 'H',
  role: UserRole.HOMEOWNER,
  created_at: new Date(),
  updated_at: new Date(),
});

const otherContractorToken = generateToken({
  id: 'contractor-2',
  email: 'c2@test.com',
  password_hash: 'hash',
  name: 'C2',
  role: UserRole.CONTRACTOR,
  created_at: new Date(),
  updated_at: new Date(),
});

describe('Jobs GraphQL (integration)', () => {
  const yoga = createYoga({
    schema: createGraphqlPort(),
    graphiql: false,
    maskedErrors: false,
    context: ({ request }) => ({
      user: extractUserFromToken(request.headers.get('authorization')),
    }),
  });

  const fetchGraphql = async (
    query: string,
    variables?: Record<string, unknown>,
    options?: { asContractor?: boolean; asHomeowner?: boolean; asOtherContractor?: boolean }
  ) => {
    const token = options?.asContractor
      ? contractorToken
      : options?.asHomeowner
        ? homeownerToken
        : options?.asOtherContractor
          ? otherContractorToken
          : undefined;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await yoga.fetch('http://localhost/graphql', {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
    });
    return res.json();
  };

  const jobId = '550e8400-e29b-41d4-a716-446655440000';
  const mockJob = {
    id: jobId,
    description: 'Kitchen remodel',
    location: '123 Main St',
    status: JobStatus.CREATED,
    cost: 5000,
    contractor_id: 'contractor-1',
    homeowner_id: 'homeowner-1',
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Query getJobById', () => {
    it('returns job when found', async () => {
      vi.mocked(jobsPortOut.getJobById).mockResolvedValue(mockJob);

      const result = (await fetchGraphql(
        `query GetJob($id: ID!) { getJobById(id: $id) { id description location status cost contractor_id homeowner_id status_message } }`,
        { id: jobId },
        { asHomeowner: true }
      )) as { data?: { getJobById?: typeof mockJob & { status_message?: string | null } } };

      expect(result.data?.getJobById?.id).toBe(jobId);
      expect(result.data?.getJobById?.description).toBe('Kitchen remodel');
      expect(result.data?.getJobById?.status).toBe(JobStatus.CREATED);
      expect(result.data?.getJobById?.status_message).toBeNull();
      expect(jobsPortOut.getJobById).toHaveBeenCalledWith(jobId);
    });

    it('returns status_message when job has validation errors', async () => {
      const jobWithStatusMessage = {
        ...mockJob,
        status: JobStatus.INVALID,
        status_message: 'Contractor user not found or does not have contractor role',
      };
      vi.mocked(jobsPortOut.getJobById).mockResolvedValue(jobWithStatusMessage);

      const result = (await fetchGraphql(
        `query GetJob($id: ID!) { getJobById(id: $id) { id status status_message } }`,
        { id: jobId },
        { asHomeowner: true }
      )) as { data?: { getJobById?: { status: string; status_message: string | null } } };

      expect(result.data?.getJobById?.status).toBe(JobStatus.INVALID);
      expect(result.data?.getJobById?.status_message).toBe(
        'Contractor user not found or does not have contractor role'
      );
    });

    it('returns error for invalid UUID format', async () => {
      const result = (await fetchGraphql(
        `query GetJob($id: ID!) { getJobById(id: $id) { id } }`,
        { id: '123' },
        { asContractor: true }
      )) as { errors?: Array<{ message: string }> };

      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.message).toBe('Invalid job ID format');
    });

    it('returns error when job not found', async () => {
      vi.mocked(jobsPortOut.getJobById).mockResolvedValue(null as never);

      const result = (await fetchGraphql(
        `query GetJob($id: ID!) { getJobById(id: $id) { id } }`,
        { id: '550e8400-e29b-41d4-a716-446655440001' },
        { asContractor: true }
      )) as { errors?: Array<{ message: string }> };

      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.message).toBe('Job not found');
    });

    it('returns error when unauthenticated', async () => {
      vi.mocked(jobsPortOut.getJobById).mockResolvedValue(mockJob);

      const result = (await fetchGraphql(`query GetJob($id: ID!) { getJobById(id: $id) { id } }`, {
        id: jobId,
      })) as { errors?: Array<{ message: string }> };

      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.message).toBe('Authentication required');
    });

    it('returns error when user is not contractor or homeowner of job', async () => {
      vi.mocked(jobsPortOut.getJobById).mockResolvedValue(mockJob);

      const result = (await fetchGraphql(
        `query GetJob($id: ID!) { getJobById(id: $id) { id } }`,
        { id: jobId },
        { asOtherContractor: true }
      )) as { errors?: Array<{ message: string }> };

      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.message).toBe('Access denied');
    });

    it('returns paginated jobMessages when requested', async () => {
      const mockMessages = [
        {
          id: 'msg-1',
          job_id: jobId,
          author_id: 'contractor-1',
          recipient_id: 'homeowner-1',
          message: 'Hello',
          created_at: new Date(),
        },
      ];
      vi.mocked(jobsPortOut.getJobById).mockResolvedValue(mockJob);
      vi.mocked(jobsPortOut.getJobMessagesPaginated).mockResolvedValue({
        messages: mockMessages,
        hasMore: false,
      });

      const result = (await fetchGraphql(
        `query GetJob($id: ID!) {
          getJobById(id: $id) {
            id
            jobMessages(limit: 10) {
              messages { id job_id author_id recipient_id message created_at }
              hasMore
            }
          }
        }`,
        { id: jobId },
        { asHomeowner: true }
      )) as {
        data?: {
          getJobById?: {
            id: string;
            jobMessages: {
              messages: Array<{
                id: string;
                job_id: string;
                author_id: string;
                recipient_id: string;
                message: string;
                created_at: string;
              }>;
              hasMore: boolean;
            };
          };
        };
      };

      expect(result.data?.getJobById?.id).toBe(jobId);
      expect(result.data?.getJobById?.jobMessages.messages).toHaveLength(1);
      expect(result.data?.getJobById?.jobMessages.messages[0].message).toBe('Hello');
      expect(result.data?.getJobById?.jobMessages.hasMore).toBe(false);
      expect(jobsPortOut.getJobMessagesPaginated).toHaveBeenCalledWith(jobId, 10, undefined);
    });

    it('passes after cursor for load more', async () => {
      vi.mocked(jobsPortOut.getJobById).mockResolvedValue(mockJob);
      vi.mocked(jobsPortOut.getJobMessagesPaginated).mockResolvedValue({
        messages: [
          {
            id: 'msg-2',
            job_id: jobId,
            author_id: 'homeowner-1',
            recipient_id: 'contractor-1',
            message: 'Thanks!',
            created_at: new Date(),
          },
        ],
        hasMore: true,
      });

      const result = (await fetchGraphql(
        `query GetJob($id: ID!, $after: ID) {
          getJobById(id: $id) {
            id
            jobMessages(limit: 10, after: $after) {
              messages { id message }
              hasMore
            }
          }
        }`,
        { id: jobId, after: 'msg-1' },
        { asHomeowner: true }
      )) as {
        data?: {
          getJobById?: {
            jobMessages: { messages: Array<{ id: string }>; hasMore: boolean };
          };
        };
      };

      expect(result.data?.getJobById?.jobMessages.messages).toHaveLength(1);
      expect(result.data?.getJobById?.jobMessages.hasMore).toBe(true);
      expect(jobsPortOut.getJobMessagesPaginated).toHaveBeenCalledWith(jobId, 10, 'msg-1');
    });
  });

  describe('Mutation createJob', () => {
    it('returns result on success', async () => {
      vi.mocked(authPortOut.getUserById).mockImplementation((async (id) => {
        if (id === 'contractor-1')
          return {
            id,
            email: 'c@test.com',
            password_hash: 'hash',
            name: 'C',
            role: UserRole.CONTRACTOR,
            created_at: new Date(),
            updated_at: new Date(),
          };
        if (id === 'homeowner-1')
          return {
            id,
            email: 'h@test.com',
            password_hash: 'hash',
            name: 'H',
            role: UserRole.HOMEOWNER,
            created_at: new Date(),
            updated_at: new Date(),
          };
        return null;
      }) as typeof authPortOut.getUserById);
      vi.mocked(jobsPortOut.createJob).mockResolvedValue([mockJob] as never);

      const result = (await fetchGraphql(
        `mutation CreateJob($input: CreateJobInput!) {
          createJob(input: $input) { id message error success }
        }`,
        {
          input: {
            description: 'Kitchen remodel',
            location: '123 Main St',
            cost: 5000,
            contractor_id: 'contractor-1',
            homeowner_id: 'homeowner-1',
          },
        },
        { asContractor: true }
      )) as { data?: { createJob?: { id: string; message: string; success: boolean } } };

      expect(result.data?.createJob?.success).toBe(true);
      expect(result.data?.createJob?.message).toBeDefined();
      expect(result.data?.createJob?.id).toBeDefined();
    });

    it('returns error when homeowner tries to create job', async () => {
      const result = (await fetchGraphql(
        `mutation CreateJob($input: CreateJobInput!) {
          createJob(input: $input) { id success }
        }`,
        {
          input: {
            description: 'Kitchen remodel',
            location: '123 Main St',
            cost: 5000,
            contractor_id: 'contractor-1',
            homeowner_id: 'homeowner-1',
          },
        },
        { asHomeowner: true }
      )) as { errors?: Array<{ message: string }> };

      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.message).toBe('Contractor role required');
    });

    it('returns error when contractor creates job with different contractor_id', async () => {
      const result = (await fetchGraphql(
        `mutation CreateJob($input: CreateJobInput!) {
          createJob(input: $input) { id success }
        }`,
        {
          input: {
            description: 'Kitchen remodel',
            location: '123 Main St',
            cost: 5000,
            contractor_id: 'contractor-2',
            homeowner_id: 'homeowner-1',
          },
        },
        { asContractor: true }
      )) as { errors?: Array<{ message: string }> };

      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.message).toBe('Can only create jobs as yourself');
    });

    it('stores job with INVALID status and status_message when contractor not found', async () => {
      vi.mocked(authPortOut.getUserById).mockImplementation((async (id) =>
        id === 'homeowner-1'
          ? {
              id,
              email: 'h@test.com',
              password_hash: 'hash',
              name: 'H',
              role: UserRole.HOMEOWNER,
              created_at: new Date(),
              updated_at: new Date(),
            }
          : null) as typeof authPortOut.getUserById);
      vi.mocked(jobsPortOut.createJob).mockResolvedValue([mockJob] as never);

      await fetchGraphql(
        `mutation CreateJob($input: CreateJobInput!) {
          createJob(input: $input) { id success }
        }`,
        {
          input: {
            description: 'Kitchen remodel',
            location: '123 Main St',
            cost: 5000,
            contractor_id: 'contractor-1',
            homeowner_id: 'homeowner-1',
          },
        },
        { asContractor: true }
      );

      expect(jobsPortOut.createJob).toHaveBeenCalled();
      const payload = vi.mocked(jobsPortOut.createJob).mock.calls[0][0] as Record<string, unknown>;
      expect(payload.status).toBe(JobStatus.INVALID);
      expect(payload.status_message).toBe(
        'Contractor user not found or does not have contractor role'
      );
    });

    it('stores job with INVALID status and status_message when homeowner not found', async () => {
      vi.mocked(authPortOut.getUserById).mockImplementation((async (id) =>
        id === 'contractor-1'
          ? {
              id,
              email: 'c@test.com',
              password_hash: 'hash',
              name: 'C',
              role: UserRole.CONTRACTOR,
              created_at: new Date(),
              updated_at: new Date(),
            }
          : null) as typeof authPortOut.getUserById);
      vi.mocked(jobsPortOut.createJob).mockResolvedValue([mockJob] as never);

      await fetchGraphql(
        `mutation CreateJob($input: CreateJobInput!) {
          createJob(input: $input) { id success }
        }`,
        {
          input: {
            description: 'Kitchen remodel',
            location: '123 Main St',
            cost: 5000,
            contractor_id: 'contractor-1',
            homeowner_id: 'homeowner-1',
          },
        },
        { asContractor: true }
      );

      expect(jobsPortOut.createJob).toHaveBeenCalled();
      const payload = vi.mocked(jobsPortOut.createJob).mock.calls[0][0] as Record<string, unknown>;
      expect(payload.status).toBe(JobStatus.INVALID);
      expect(payload.status_message).toBe(
        'Homeowner user not found or does not have homeowner role'
      );
    });

    it('stores job with INVALID status and status_message when contractor has wrong role', async () => {
      vi.mocked(authPortOut.getUserById).mockImplementation((async (id) => {
        if (id === 'contractor-1')
          return {
            id,
            email: 'c@test.com',
            password_hash: 'hash',
            name: 'C',
            role: UserRole.HOMEOWNER,
            created_at: new Date(),
            updated_at: new Date(),
          };
        if (id === 'homeowner-1')
          return {
            id,
            email: 'h@test.com',
            password_hash: 'hash',
            name: 'H',
            role: UserRole.HOMEOWNER,
            created_at: new Date(),
            updated_at: new Date(),
          };
        return null;
      }) as typeof authPortOut.getUserById);
      vi.mocked(jobsPortOut.createJob).mockResolvedValue([mockJob] as never);

      await fetchGraphql(
        `mutation CreateJob($input: CreateJobInput!) {
          createJob(input: $input) { id success }
        }`,
        {
          input: {
            description: 'Kitchen remodel',
            location: '123 Main St',
            cost: 5000,
            contractor_id: 'contractor-1',
            homeowner_id: 'homeowner-1',
          },
        },
        { asContractor: true }
      );

      expect(jobsPortOut.createJob).toHaveBeenCalled();
      const payload = vi.mocked(jobsPortOut.createJob).mock.calls[0][0] as Record<string, unknown>;
      expect(payload.status).toBe(JobStatus.INVALID);
      expect(payload.status_message).toBe(
        'Contractor user not found or does not have contractor role'
      );
    });
  });

  describe('Mutation patchJob', () => {
    it('returns result on success', async () => {
      vi.mocked(jobsPortOut.getJobById).mockResolvedValue(mockJob);
      vi.mocked(authPortOut.getUserById).mockImplementation((async (id) =>
        id === 'contractor-1'
          ? {
              id,
              email: 'c@test.com',
              password_hash: 'hash',
              name: 'C',
              role: UserRole.CONTRACTOR,
              created_at: new Date(),
              updated_at: new Date(),
            }
          : null) as typeof authPortOut.getUserById);
      vi.mocked(jobsPortOut.patchJob).mockResolvedValue([
        { ...mockJob, description: 'Updated' },
      ] as never);

      const result = (await fetchGraphql(
        `mutation PatchJob($input: PatchJobInput!) {
          patchJob(input: $input) { id message error success }
        }`,
        {
          input: { id: jobId, description: 'Updated' },
        },
        { asContractor: true }
      )) as { data?: { patchJob?: { id: string; message: string; success: boolean } } };

      expect(result.data?.patchJob?.success).toBe(true);
      expect(result.data?.patchJob?.id).toBe(jobId);
    });

    it('passes only patched fields to port (partial update)', async () => {
      vi.mocked(jobsPortOut.getJobById).mockResolvedValue(mockJob);
      vi.mocked(jobsPortOut.patchJob).mockResolvedValue([
        { ...mockJob, status: JobStatus.COMPLETED },
      ] as never);

      await fetchGraphql(
        `mutation PatchJob($input: PatchJobInput!) {
          patchJob(input: $input) { id message success }
        }`,
        {
          input: { id: jobId, status: JobStatus.COMPLETED },
        },
        { asContractor: true }
      );

      expect(jobsPortOut.patchJob).toHaveBeenCalled();
      const payload = vi.mocked(jobsPortOut.patchJob).mock.calls[0][0] as Record<string, unknown>;
      expect(payload).toMatchObject({
        id: jobId,
        status: JobStatus.COMPLETED,
        status_message: null,
      });
      expect(Object.keys(payload)).toEqual(['id', 'status', 'status_message']);
    });

    it('patches job with INVALID status and status_message when homeowner not found', async () => {
      vi.mocked(jobsPortOut.getJobById).mockResolvedValue(mockJob);
      vi.mocked(authPortOut.getUserById).mockImplementation(
        (async () => null) as unknown as typeof authPortOut.getUserById
      );
      vi.mocked(jobsPortOut.patchJob).mockResolvedValue([
        {
          ...mockJob,
          status: JobStatus.INVALID,
          status_message: 'Homeowner user not found or does not have homeowner role',
        },
      ] as never);

      await fetchGraphql(
        `mutation PatchJob($input: PatchJobInput!) {
          patchJob(input: $input) { id success }
        }`,
        {
          input: { id: jobId, homeowner_id: 'homeowner-2' },
        },
        { asContractor: true }
      );

      expect(jobsPortOut.patchJob).toHaveBeenCalled();
      const payload = vi.mocked(jobsPortOut.patchJob).mock.calls[0][0] as Record<string, unknown>;
      expect(payload.status).toBe(JobStatus.INVALID);
      expect(payload.status_message).toBe(
        'Homeowner user not found or does not have homeowner role'
      );
    });

    it('patches job with INVALID status and status_message when homeowner has wrong role', async () => {
      vi.mocked(jobsPortOut.getJobById).mockResolvedValue(mockJob);
      vi.mocked(authPortOut.getUserById).mockImplementation((async (id) =>
        id === 'homeowner-2'
          ? {
              id,
              email: 'h2@test.com',
              password_hash: 'hash',
              name: 'H2',
              role: UserRole.CONTRACTOR,
              created_at: new Date(),
              updated_at: new Date(),
            }
          : null) as typeof authPortOut.getUserById);
      vi.mocked(jobsPortOut.patchJob).mockResolvedValue([
        { ...mockJob, status: JobStatus.INVALID },
      ] as never);

      await fetchGraphql(
        `mutation PatchJob($input: PatchJobInput!) {
          patchJob(input: $input) { id success }
        }`,
        {
          input: { id: jobId, homeowner_id: 'homeowner-2' },
        },
        { asContractor: true }
      );

      expect(jobsPortOut.patchJob).toHaveBeenCalled();
      const payload = vi.mocked(jobsPortOut.patchJob).mock.calls[0][0] as Record<string, unknown>;
      expect(payload.status).toBe(JobStatus.INVALID);
      expect(payload.status_message).toBe(
        'Homeowner user not found or does not have homeowner role'
      );
    });

    it('returns error when contractor patches job they do not own', async () => {
      vi.mocked(jobsPortOut.getJobById).mockResolvedValue(mockJob);

      const result = (await fetchGraphql(
        `mutation PatchJob($input: PatchJobInput!) {
          patchJob(input: $input) { id success }
        }`,
        {
          input: { id: jobId, description: 'Updated' },
        },
        { asOtherContractor: true }
      )) as { errors?: Array<{ message: string }> };

      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.message).toBe('Access denied');
      expect(jobsPortOut.patchJob).not.toHaveBeenCalled();
    });
  });

  describe('Mutation deleteJob', () => {
    it('returns result on success', async () => {
      vi.mocked(jobsPortOut.getJobById).mockResolvedValue(mockJob);
      vi.mocked(jobsPortOut.deleteJob).mockResolvedValue(undefined as never);

      const result = (await fetchGraphql(
        `mutation DeleteJob($id: ID!) {
          deleteJob(id: $id) { id message error success }
        }`,
        { id: jobId },
        { asContractor: true }
      )) as { data?: { deleteJob?: { id: string; message: string; success: boolean } } };

      expect(result.data?.deleteJob?.success).toBe(true);
      expect(result.data?.deleteJob?.id).toBe(jobId);
      expect(jobsPortOut.deleteJob).toHaveBeenCalledWith(jobId);
    });

    it('returns error when contractor deletes job they do not own', async () => {
      vi.mocked(jobsPortOut.getJobById).mockResolvedValue(mockJob);

      const result = (await fetchGraphql(
        `mutation DeleteJob($id: ID!) {
          deleteJob(id: $id) { id success }
        }`,
        { id: jobId },
        { asOtherContractor: true }
      )) as { errors?: Array<{ message: string }> };

      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.message).toBe('Access denied');
      expect(jobsPortOut.deleteJob).not.toHaveBeenCalled();
    });
  });

  describe('Mutation addJobMessage', () => {
    const mockInsertedMessage = {
      id: 'msg-new',
      job_id: jobId,
      author_id: 'contractor-1',
      recipient_id: 'homeowner-1',
      message: 'Progress update',
      created_at: new Date(),
    };

    it('returns message on success when contractor sends to homeowner', async () => {
      vi.mocked(jobsPortOut.getJobById).mockResolvedValue(mockJob);
      vi.mocked(jobsPortOut.insertJobMessage).mockResolvedValue([mockInsertedMessage]);

      const result = (await fetchGraphql(
        `mutation AddJobMessage($input: AddJobMessageInput!) {
          addJobMessage(input: $input) { id job_id author_id recipient_id message created_at }
        }`,
        {
          input: {
            job_id: jobId,
            recipient_id: 'homeowner-1',
            message: 'Progress update',
          },
        },
        { asContractor: true }
      )) as {
        data?: {
          addJobMessage?: {
            id: string;
            job_id: string;
            author_id: string;
            recipient_id: string;
            message: string;
            created_at: string;
          };
        };
      };

      expect(result.data?.addJobMessage?.id).toBe('msg-new');
      expect(result.data?.addJobMessage?.message).toBe('Progress update');
      expect(result.data?.addJobMessage?.author_id).toBe('contractor-1');
      expect(jobsPortOut.insertJobMessage).toHaveBeenCalled();
    });

    it('returns message on success when homeowner sends to contractor', async () => {
      vi.mocked(jobsPortOut.getJobById).mockResolvedValue(mockJob);
      vi.mocked(jobsPortOut.insertJobMessage).mockResolvedValue([
        { ...mockInsertedMessage, author_id: 'homeowner-1', recipient_id: 'contractor-1' },
      ]);

      const result = (await fetchGraphql(
        `mutation AddJobMessage($input: AddJobMessageInput!) {
          addJobMessage(input: $input) { id author_id recipient_id message }
        }`,
        {
          input: {
            job_id: jobId,
            recipient_id: 'contractor-1',
            message: 'When can you start?',
          },
        },
        { asHomeowner: true }
      )) as { data?: { addJobMessage?: { author_id: string; recipient_id: string } } };

      expect(result.data?.addJobMessage?.author_id).toBe('homeowner-1');
      expect(result.data?.addJobMessage?.recipient_id).toBe('contractor-1');
    });

    it('returns error when unauthenticated', async () => {
      vi.mocked(jobsPortOut.getJobById).mockResolvedValue(mockJob);

      const result = (await fetchGraphql(
        `mutation AddJobMessage($input: AddJobMessageInput!) {
          addJobMessage(input: $input) { id }
        }`,
        {
          input: {
            job_id: jobId,
            recipient_id: 'homeowner-1',
            message: 'Hello',
          },
        }
      )) as { errors?: Array<{ message: string }> };

      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.message).toBe('Authentication required');
      expect(jobsPortOut.insertJobMessage).not.toHaveBeenCalled();
    });

    it('returns error when user has no access to job', async () => {
      vi.mocked(jobsPortOut.getJobById).mockResolvedValue(mockJob);

      const result = (await fetchGraphql(
        `mutation AddJobMessage($input: AddJobMessageInput!) {
          addJobMessage(input: $input) { id }
        }`,
        {
          input: {
            job_id: jobId,
            recipient_id: 'homeowner-1',
            message: 'Hello',
          },
        },
        { asOtherContractor: true }
      )) as { errors?: Array<{ message: string }> };

      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.message).toBe('Access denied');
      expect(jobsPortOut.insertJobMessage).not.toHaveBeenCalled();
    });

    it('returns error when recipient is not contractor or homeowner', async () => {
      vi.mocked(jobsPortOut.getJobById).mockResolvedValue(mockJob);

      const result = (await fetchGraphql(
        `mutation AddJobMessage($input: AddJobMessageInput!) {
          addJobMessage(input: $input) { id }
        }`,
        {
          input: {
            job_id: jobId,
            recipient_id: 'contractor-2',
            message: 'Hello',
          },
        },
        { asContractor: true }
      )) as { errors?: Array<{ message: string }> };

      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.message).toBe(
        'Recipient must be the contractor or homeowner of the job'
      );
      expect(jobsPortOut.insertJobMessage).not.toHaveBeenCalled();
    });

    it('returns error when message is empty', async () => {
      vi.mocked(jobsPortOut.getJobById).mockResolvedValue(mockJob);

      const result = (await fetchGraphql(
        `mutation AddJobMessage($input: AddJobMessageInput!) {
          addJobMessage(input: $input) { id }
        }`,
        {
          input: {
            job_id: jobId,
            recipient_id: 'homeowner-1',
            message: '   ',
          },
        },
        { asContractor: true }
      )) as { errors?: Array<{ message: string }> };

      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0]?.message).toBe('Message cannot be empty');
    });
  });

  describe('Subscription jobMessages', () => {
    it('subscription is defined in schema', async () => {
      const result = (await fetchGraphql(
        `query Introspect { __schema { subscriptionType { name fields { name } } } }`,
        undefined,
        { asHomeowner: true }
      )) as {
        data?: {
          __schema?: { subscriptionType?: { name: string; fields: Array<{ name: string }> } };
        };
      };
      expect(result.data?.__schema?.subscriptionType?.name).toBe('Subscription');
      const jobMessagesField = result.data?.__schema?.subscriptionType?.fields?.find(
        (f) => f.name === 'jobMessages'
      );
      expect(jobMessagesField).toBeDefined();
    });
  });
});
