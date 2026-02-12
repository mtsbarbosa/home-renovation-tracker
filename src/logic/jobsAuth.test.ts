import { describe, it, expect } from 'vitest';
import { canViewJob, canEditJobAsContractor, canCreateJobAsContractor } from './jobsAuth.js';
import { JobStatus } from '../models/job.js';

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

describe('canViewJob', () => {
  it('returns true when user is contractor', () => {
    expect(canViewJob(baseJob, 'contractor-1')).toBe(true);
  });

  it('returns true when user is homeowner', () => {
    expect(canViewJob(baseJob, 'homeowner-1')).toBe(true);
  });

  it('returns false when user is neither', () => {
    expect(canViewJob(baseJob, 'contractor-2')).toBe(false);
    expect(canViewJob(baseJob, 'other')).toBe(false);
  });
});

describe('canEditJobAsContractor', () => {
  it('returns true when user is contractor', () => {
    expect(canEditJobAsContractor(baseJob, 'contractor-1')).toBe(true);
  });

  it('returns false when user is not contractor', () => {
    expect(canEditJobAsContractor(baseJob, 'contractor-2')).toBe(false);
    expect(canEditJobAsContractor(baseJob, 'homeowner-1')).toBe(false);
  });
});

describe('canCreateJobAsContractor', () => {
  it('returns true when contractor_id matches userId', () => {
    expect(canCreateJobAsContractor('contractor-1', 'contractor-1')).toBe(true);
  });

  it('returns false when contractor_id does not match', () => {
    expect(canCreateJobAsContractor('contractor-2', 'contractor-1')).toBe(false);
  });
});
