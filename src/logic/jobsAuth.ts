import type { Job } from '../models/job.js';

export function canViewJob(job: Job, userId: string): boolean {
  return job.contractor_id === userId || job.homeowner_id === userId;
}

export function canEditJobAsContractor(job: Job, userId: string): boolean {
  return job.contractor_id === userId;
}

export function canCreateJobAsContractor(inputContractorId: string, userId: string): boolean {
  return inputContractorId === userId;
}
