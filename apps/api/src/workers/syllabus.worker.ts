import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { env } from '../config/env';
import { prisma } from '../config/database';
import { QUEUE_NAMES } from '../queues/queue.constants';
import { ProcessSyllabusJobData, ProcessSyllabusJobResult } from '../jobs/process-syllabus.job';
import { syllabusParserService } from '../services/ai/syllabus-parser.service';

/**
 * Isolated, testable processing function for syllabus extraction.
 */
export async function processSyllabusJob(
  data: ProcessSyllabusJobData,
  prismaClient = prisma,
  parser = syllabusParserService
): Promise<ProcessSyllabusJobResult> {
  if (!data || !data.rawText || !data.courseId || !data.syllabusId) {
    throw new Error('Invalid job payload: rawText, courseId, and syllabusId are required.');
  }

  const { rawText, courseId, syllabusId } = data;

  try {
    const parsedSyllabus = await parser.parse(rawText);

    // Atomically update Course, clean any previous unconfirmed tasks, insert tasks, and mark syllabus completed
    await prismaClient.$transaction(async (tx) => {
      await tx.course.update({
        where: { id: courseId },
        data: {
          title: parsedSyllabus.course,
          course_code: parsedSyllabus.courseCode || null,
          instructor: parsedSyllabus.instructor || null,
          semester: parsedSyllabus.semester || null,
        }
      });

      // Prevent duplicate tasks on job retries: clean pending unreviewed tasks for this syllabus
      await tx.task.deleteMany({
        where: { syllabus_id: syllabusId, needs_review: true }
      });

      // Insert validated tasks
      if (parsedSyllabus.tasks && parsedSyllabus.tasks.length > 0) {
        await tx.task.createMany({
          data: parsedSyllabus.tasks.map(t => {
            const isDateOnly = t.isDateOnly !== undefined
              ? Boolean(t.isDateOnly)
              : (t.deadline ? /^\d{4}-\d{2}-\d{2}$/.test(t.deadline.trim()) : false);

            return {
              syllabus_id: syllabusId,
              course_id: courseId,
              title: t.name,
              type: t.type,
              weight: t.weight ?? null,
              deadline: t.deadline ? new Date(t.deadline) : null,
              is_date_only: isDateOnly,
              estimated_duration: t.estimatedDuration ?? null,
              description: t.description ?? null,
              recurring: t.recurring || false,
              status: 'pending',
              needs_review: true,
            };
          })
        });
      }

      // Mark extraction as completed ONLY after all tasks are persisted
      await tx.syllabus.update({
        where: { id: syllabusId },
        data: {
          course_name: parsedSyllabus.course,
          analysis_status: 'completed'
        }
      });
    });

    return parsedSyllabus as ProcessSyllabusJobResult;
  } catch (error: any) {
    console.error(`Error processing syllabus:`, error.message);
    if (syllabusId) {
      await prismaClient.syllabus.update({
        where: { id: syllabusId },
        data: { analysis_status: 'failed' }
      }).catch(console.error);
    }
    throw error;
  }
}

let syllabusWorker: Worker<ProcessSyllabusJobData, ProcessSyllabusJobResult> | null = null;

if (process.env.NODE_ENV !== 'test') {
  const redisConnection = new Redis({
    host: env.redis.host,
    port: env.redis.port,
    maxRetriesPerRequest: null,
  });

  syllabusWorker = new Worker<ProcessSyllabusJobData, ProcessSyllabusJobResult>(
    QUEUE_NAMES.SYLLABUS_PROCESSING,
    async (job: Job<ProcessSyllabusJobData>) => {
      console.log(`Processing syllabus job ${job.id}`);
      return processSyllabusJob(job.data);
    },
    { connection: redisConnection }
  );

  syllabusWorker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed with error ${err.message}`);
  });
}

export { syllabusWorker };
