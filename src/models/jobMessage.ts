export type JobMessage = {
  id: string;
  job_id: string;
  author_id: string;
  recipient_id: string;
  message: string;
  created_at: Date;
};
