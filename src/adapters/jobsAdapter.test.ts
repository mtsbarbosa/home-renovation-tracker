import { describe, it, expect, vi } from 'vitest';
import {
  validateJobForCreate,
  validateJobForPatch,
  prepareJobForCreate,
  prepareJobForPatch,
} from './jobsAdapter.js';
import { JobStatus } from '../models/job.js';
import { UserRole } from '../models/user.js';

const baseJob = {
  id: 'job-1',
  description: 'Kitchen remodel',
  location: '123 Main St',
  status: JobStatus.CREATED,
  cost: 5000,
  contractor_id: 'contractor-1',
  homeowner_id: 'homeowner-1',
  created_at: new Date(),
  updated_at: new Date(),
};

const contractor = {
  id: 'contractor-1',
  email: 'c@test.com',
  password_hash: 'hash',
  name: 'C',
  role: UserRole.CONTRACTOR,
  created_at: new Date(),
  updated_at: new Date(),
};

const homeowner = {
  id: 'homeowner-1',
  email: 'h@test.com',
  password_hash: 'hash',
  name: 'H',
  role: UserRole.HOMEOWNER,
  created_at: new Date(),
  updated_at: new Date(),
};

describe('validateJobForCreate', () => {
  it('returns CREATED with status_message null when contractor and homeowner valid', () => {
    const result = validateJobForCreate(baseJob, contractor, homeowner);
    expect(result.status).toBe(JobStatus.CREATED);
    expect(result.status_message).toBeNull();
  });

  it('returns CREATED with status_message null when no homeowner_id', () => {
    const jobWithoutHomeowner = { ...baseJob, homeowner_id: '' };
    const result = validateJobForCreate(jobWithoutHomeowner, contractor, null);
    expect(result.status).toBe(JobStatus.CREATED);
    expect(result.status_message).toBeNull();
  });

  it('returns INVALID when contractor not found', () => {
    const result = validateJobForCreate(baseJob, null, homeowner);
    expect(result.status).toBe(JobStatus.INVALID);
    expect(result.status_message).toBe(
      'Contractor user not found or does not have contractor role'
    );
  });

  it('returns INVALID when contractor has wrong role', () => {
    const wrongRole = { ...contractor, role: UserRole.HOMEOWNER };
    const result = validateJobForCreate(baseJob, wrongRole, homeowner);
    expect(result.status).toBe(JobStatus.INVALID);
    expect(result.status_message).toBe(
      'Contractor user not found or does not have contractor role'
    );
  });

  it('returns INVALID when homeowner not found', () => {
    const result = validateJobForCreate(baseJob, contractor, null);
    expect(result.status).toBe(JobStatus.INVALID);
    expect(result.status_message).toBe('Homeowner user not found or does not have homeowner role');
  });

  it('returns INVALID when homeowner has wrong role', () => {
    const wrongRole = { ...homeowner, role: UserRole.CONTRACTOR };
    const result = validateJobForCreate(baseJob, contractor, wrongRole);
    expect(result.status).toBe(JobStatus.INVALID);
    expect(result.status_message).toBe('Homeowner user not found or does not have homeowner role');
  });

  it('accumulates multiple validation errors', () => {
    const result = validateJobForCreate(baseJob, null, null);
    expect(result.status).toBe(JobStatus.INVALID);
    expect(result.status_message).toContain('Contractor user not found');
    expect(result.status_message).toContain('Homeowner user not found');
    expect(result.status_message).toContain('; ');
  });
});

describe('validateJobForPatch', () => {
  it('returns status_message null when no homeowner_id', () => {
    const jobWithoutHomeowner = { ...baseJob, homeowner_id: '' };
    const result = validateJobForPatch(jobWithoutHomeowner, null);
    expect(result.status_message).toBeNull();
  });

  it('returns status_message null when homeowner valid', () => {
    const result = validateJobForPatch(baseJob, homeowner);
    expect(result.status_message).toBeNull();
  });

  it('returns INVALID when homeowner not found', () => {
    const result = validateJobForPatch(baseJob, null);
    expect(result.status).toBe(JobStatus.INVALID);
    expect(result.status_message).toBe('Homeowner user not found or does not have homeowner role');
  });

  it('returns INVALID when homeowner has wrong role', () => {
    const wrongRole = { ...homeowner, role: UserRole.CONTRACTOR };
    const result = validateJobForPatch(baseJob, wrongRole);
    expect(result.status).toBe(JobStatus.INVALID);
    expect(result.status_message).toBe('Homeowner user not found or does not have homeowner role');
  });
});

describe('prepareJobForCreate', () => {
  it('returns valid job when getUserById resolves users', async () => {
    const getUserById = vi.fn().mockImplementation(async (id: string) => {
      if (id === 'contractor-1') return contractor;
      if (id === 'homeowner-1') return homeowner;
      return null;
    });

    const result = await prepareJobForCreate(baseJob, getUserById);

    expect(result.status).toBe(JobStatus.CREATED);
    expect(result.status_message).toBeNull();
    expect(getUserById).toHaveBeenCalledWith('contractor-1');
    expect(getUserById).toHaveBeenCalledWith('homeowner-1');
  });

  it('returns invalid job when getUserById returns null for contractor', async () => {
    const getUserById = vi.fn().mockImplementation(async (id: string) => {
      if (id === 'homeowner-1') return homeowner;
      return null;
    });

    const result = await prepareJobForCreate(baseJob, getUserById);

    expect(result.status).toBe(JobStatus.INVALID);
    expect(result.status_message).toBe(
      'Contractor user not found or does not have contractor role'
    );
  });
});

describe('prepareJobForPatch', () => {
  it('returns valid job when homeowner valid', async () => {
    const getUserById = vi.fn().mockResolvedValue(homeowner);

    const result = await prepareJobForPatch(baseJob, getUserById);

    expect(result.status_message).toBeNull();
    expect(getUserById).toHaveBeenCalledWith('homeowner-1');
  });

  it('returns invalid job when homeowner not found', async () => {
    const getUserById = vi.fn().mockResolvedValue(null);

    const result = await prepareJobForPatch(baseJob, getUserById);

    expect(result.status).toBe(JobStatus.INVALID);
    expect(result.status_message).toBe('Homeowner user not found or does not have homeowner role');
  });
});
