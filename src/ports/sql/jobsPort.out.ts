import { Job, JobStatus } from '../../models/job.js';
import { db } from '../../db/index.js';

export async function getJobById(id: string): Promise<Job> {
  return db('jobs').where('id', id).first();
}

export async function createJob(job: Job): Promise<any[]> {
  const { status, status_message, ...rest } = job;
  const row = {
    ...rest,
    status: status ?? JobStatus.CREATED,
    status_message: status_message ?? null,
  };
  return db('jobs').insert(row).returning('*');
}

export async function patchJob(job: Job): Promise<any[]> {
  const { id, contractor_id: _, updated_at: __, created_at: ___, ...rest } = job;
  const updatePayload = {
    ...rest,
    status_message: rest.status_message ?? null,
    updated_at: new Date(),
  };
  return db('jobs').where('id', id).update(updatePayload).returning('*');
}

export async function deleteJob(id: string): Promise<void> {
  return db('jobs').where('id', id).delete();
}
