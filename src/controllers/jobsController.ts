import { Job } from '../models/job.js';
import { Result } from '../models/result.js';
import { prepareJobForCreate, prepareJobForPatch } from '../adapters/jobsAdapter.js';
import {
  createJob as createJobPort,
  patchJob as patchJobPort,
  deleteJob as deleteJobPort,
  getJobById as getJobByIdPort,
} from '../ports/sql/jobsPort.out.js';
import { getUserById } from '../ports/sql/authPort.out.js';

export async function getJobById(id: string): Promise<Job> {
  return getJobByIdPort(id);
}

export async function createJob(job: Job): Promise<Result> {
  const jobToInsert = await prepareJobForCreate(job, (id) =>
    getUserById(id).then((r) => r ?? null)
  );
  await createJobPort(jobToInsert);
  return { id: job.id, message: 'Job being created', error: null, success: true };
}

export async function patchJob(job: Job): Promise<Result> {
  const jobToUpdate = await prepareJobForPatch(job, (id) => getUserById(id).then((r) => r ?? null));
  await patchJobPort(jobToUpdate);
  return { id: job.id, message: 'Job being patched', error: null, success: true };
}

export async function deleteJob(id: string): Promise<Result> {
  deleteJobPort(id);
  return { id: id, message: 'Job being deleted', error: null, success: true };
}
