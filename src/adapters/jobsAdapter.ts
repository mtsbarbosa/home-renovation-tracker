import { Job, JobStatus } from '../models/job.js';
import { User, UserRole } from '../models/user.js';

export function validateJobForCreate(
  job: Job,
  contractor: User | null,
  homeowner: User | null
): Job {
  const invalidReasons: string[] = [];
  if (!contractor || contractor.role !== UserRole.CONTRACTOR) {
    invalidReasons.push('Contractor user not found or does not have contractor role');
  }
  if (job.homeowner_id) {
    if (!homeowner || homeowner.role !== UserRole.HOMEOWNER) {
      invalidReasons.push('Homeowner user not found or does not have homeowner role');
    }
  }
  if (invalidReasons.length > 0) {
    return { ...job, status: JobStatus.INVALID, status_message: invalidReasons.join('; ') };
  }
  return { ...job, status: JobStatus.CREATED, status_message: null };
}

export function validateJobForPatch(job: Job, homeowner: User | null): Job {
  if (!job.homeowner_id) {
    return { ...job, status_message: null };
  }
  if (!homeowner || homeowner.role !== UserRole.HOMEOWNER) {
    return {
      ...job,
      status: JobStatus.INVALID,
      status_message: 'Homeowner user not found or does not have homeowner role',
    };
  }
  return { ...job, status_message: null };
}

export type GetUserById = (id: string) => Promise<User | null | undefined>;

export async function prepareJobForCreate(job: Job, getUserById: GetUserById): Promise<Job> {
  const contractor = await getUserById(job.contractor_id);
  const homeowner = job.homeowner_id ? await getUserById(job.homeowner_id) : null;
  return validateJobForCreate(job, contractor ?? null, homeowner ?? null);
}

export async function prepareJobForPatch(job: Job, getUserById: GetUserById): Promise<Job> {
  const homeowner = job.homeowner_id ? await getUserById(job.homeowner_id) : null;
  return validateJobForPatch(job, homeowner ?? null);
}
