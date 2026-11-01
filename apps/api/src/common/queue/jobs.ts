/** Background job names and payloads, shared by the API (producer) and the worker. */
export interface JobPayloads {
  "ingestion.process": { jobId: string };
  "search.sync": { ingestionJobId?: string };
  "lead.notify-analyst": { leadId: string };
}
export type JobName = keyof JobPayloads;

export type JobHandler<N extends JobName = JobName> = (payload: JobPayloads[N]) => Promise<void>;
export type JobHandlers = { [N in JobName]: JobHandler<N> };

export const QUEUE_NAME = "finsol";
