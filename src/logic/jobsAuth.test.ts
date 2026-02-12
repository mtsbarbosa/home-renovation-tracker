import { describe, it, expect } from 'vitest';
import {
  canViewJob,
  canEditJobAsContractor,
  canCreateJobAsContractor,
  canAddMessageToJob,
  isValidMessageRecipient,
} from './jobsAuth.js';
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

describe('canAddMessageToJob', () => {
  it('returns true when user is contractor or homeowner', () => {
    expect(canAddMessageToJob(baseJob, 'contractor-1')).toBe(true);
    expect(canAddMessageToJob(baseJob, 'homeowner-1')).toBe(true);
  });

  it('returns false when user has no access', () => {
    expect(canAddMessageToJob(baseJob, 'contractor-2')).toBe(false);
  });
});

describe('isValidMessageRecipient', () => {
  it('returns true when recipient is the other party', () => {
    expect(isValidMessageRecipient(baseJob, 'contractor-1', 'homeowner-1')).toBe(true);
    expect(isValidMessageRecipient(baseJob, 'homeowner-1', 'contractor-1')).toBe(true);
  });

  it('returns false when recipient is the author', () => {
    expect(isValidMessageRecipient(baseJob, 'contractor-1', 'contractor-1')).toBe(false);
  });

  it('returns false when recipient is not contractor or homeowner', () => {
    expect(isValidMessageRecipient(baseJob, 'contractor-1', 'contractor-2')).toBe(false);
  });

  it('returns false when author is not contractor or homeowner', () => {
    expect(isValidMessageRecipient(baseJob, 'contractor-2', 'homeowner-1')).toBe(false);
  });
});
