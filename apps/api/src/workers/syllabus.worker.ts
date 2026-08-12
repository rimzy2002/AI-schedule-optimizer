import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { env } from '../config/env';
import { QUEUE_NAMES } from '../queues/queue.constants';
import { ProcessSyllabusJobData, ProcessSyllabusJobResult } from '../jobs/process-syllabus.job';
import { syllabusParserService } from '../services/ai/syllabus-parser.service';

const redisConnection = new Redis({
  host: env.redis.host,
  port: env.redis.port,
  maxRetriesPerRequest: null,
});

export const syllabusWorker = new Worker<ProcessSyllabusJobData, ProcessSyllabusJobResult>(
  QUEUE_NAMES.SYLLABUS_PROCESSING,
  async (job: Job<ProcessSyllabusJobData>) => {
    console.log(`Processing syllabus job ${job.id}`);
    const { rawText } = job.data;
    
    try {
      const parsedSyllabus = await syllabusParserService.parse(rawText);
      console.log(`Successfully processed syllabus job ${job.id}`);
      return parsedSyllabus as ProcessSyllabusJobResult;
    } catch (error: any) {
      console.error(`Error processing syllabus job ${job.id}:`, error);
      throw error;
    }
  },
  { connection: redisConnection }
);

syllabusWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed with error ${err.message}`);
});
