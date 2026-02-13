import { Job, JobStatus } from '../../models/job.js';
import type { JobMessage } from '../../models/jobMessage.js';
import { db } from '../../db/index.js';

export async function getJobById(id: string): Promise<Job> {
  return db('jobs').where('id', id).first();
}

export async function createJob(job: Job): Promise<Job[]> {
  const { status, status_message, ...rest } = job;
  const row = {
    ...rest,
    status: status ?? JobStatus.CREATED,
    status_message: status_message ?? null,
  };
  return db('jobs').insert(row).returning('*');
}

export async function patchJob(job: Job): Promise<Job[]> {
  const { id, contractor_id: _, ...rest } = job;
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

export async function insertJobMessage(msg: JobMessage): Promise<JobMessage[]> {
  return db('job_messages').insert(msg).returning('*');
}

export async function getJobMessagesByJobId(jobId: string): Promise<JobMessage[]> {
  return db('job_messages').where('job_id', jobId).orderBy('created_at', 'asc');
}

export async function getJobMessageById(id: string, jobId: string): Promise<JobMessage | null> {
  return db('job_messages').where({ id, job_id: jobId }).first();
}

export type JobMessagesPage = {
  messages: JobMessage[];
  hasMore: boolean;
};

export async function getJobMessagesPaginated(
  jobId: string,
  limit: number,
  afterMessageId?: string | null
): Promise<JobMessagesPage> {
  const pageSize = Math.min(Math.max(1, limit), 100);
  let query = db('job_messages').where('job_id', jobId).orderBy('created_at', 'asc');

  if (afterMessageId) {
    const cursorMsg = await getJobMessageById(afterMessageId, jobId);
    if (!cursorMsg) {
      return { messages: [], hasMore: false };
    }
    query = query.where('created_at', '>', cursorMsg.created_at);
  }

  const rows = await query.limit(pageSize + 1);
  const hasMore = rows.length > pageSize;
  const messages = hasMore ? rows.slice(0, pageSize) : rows;

  return { messages, hasMore };
}
