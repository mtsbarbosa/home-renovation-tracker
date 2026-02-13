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

export function canAddMessageToJob(job: Job, userId: string): boolean {
  return canViewJob(job, userId);
}

export function isValidMessageRecipient(job: Job, authorId: string, recipientId: string): boolean {
  if (recipientId === authorId) return false;
  const authorValid = job.contractor_id === authorId || job.homeowner_id === authorId;
  const recipientValid = job.contractor_id === recipientId || job.homeowner_id === recipientId;
  return authorValid && recipientValid;
}
