export enum JobStatus {
  CREATED = 'CREATED',
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  INVALID = 'INVALID',
}

export type Job = {
  id: string;
  description: string;
  location: string;
  status: JobStatus;
  cost: number;
  contractor_id: string;
  homeowner_id: string;
  created_at: Date;
  updated_at: Date;
  status_message?: string | null;
};
