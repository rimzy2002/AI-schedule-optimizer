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
    const { rawText, userId, courseId, syllabusId } = job.data;
    
    try {
      const parsedSyllabus = await syllabusParserService.parse(rawText);
      console.log(`Successfully parsed syllabus for job ${job.id}`);
      
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      // Update Course and Syllabus
      await prisma.course.update({
        where: { id: courseId },
        data: { title: parsedSyllabus.course }
      });
      
      await prisma.syllabus.update({
        where: { id: syllabusId },
        data: { course_name: parsedSyllabus.course, analysis_status: 'completed' }
      });
      
      // Create Tasks
      if (parsedSyllabus.tasks && parsedSyllabus.tasks.length > 0) {
        await prisma.task.createMany({
          data: parsedSyllabus.tasks.map(t => ({
            syllabus_id: syllabusId,
            course_id: courseId,
            title: t.name,
            type: t.type,
            weight: t.weight,
            deadline: t.deadline ? new Date(t.deadline) : null,
            status: 'pending',
            needs_review: true,
          }))
        });
      }

      return parsedSyllabus as ProcessSyllabusJobResult;
    } catch (error: any) {
      console.error(`Error processing syllabus job ${job.id}:`, error);
      
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      await prisma.syllabus.update({
        where: { id: job.data.syllabusId },
        data: { analysis_status: 'failed' }
      }).catch(console.error);

      throw error;
    }
  },
  { connection: redisConnection }
);

syllabusWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed with error ${err.message}`);
});
