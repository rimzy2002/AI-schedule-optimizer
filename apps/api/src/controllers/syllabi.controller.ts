import { Request, Response } from 'express';
import { prisma } from '@ai-schedule-optimizer/database';
import { syllabusQueue } from '../queues/syllabus.queue';
import { extractSyllabusSchema } from '../schemas/syllabi.schema';
import { asyncHandler } from '../utils/asyncHandler';

export class SyllabiController {
  extractSyllabus = asyncHandler(async (req: Request, res: Response) => {
    // @ts-ignore - mock user authentication for now
    let userId = req.user?.id;
    
    if (!userId) {
      // Create a default mock user if none exists
      let mockUser = await prisma.user.findFirst();
      if (!mockUser) {
        mockUser = await prisma.user.create({
          data: {
            email: 'mock@example.com',
            password_hash: 'mock_hash',
          }
        });
      }
      userId = mockUser.id;
    }

    const result = extractSyllabusSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ error: 'Invalid input', details: result.error.format() });
      return;
    }

    const { rawText } = result.data;

    // Create a new Course and Syllabus record in the database
    const course = await prisma.course.create({
      data: {
        user_id: userId,
        title: 'Imported Syllabus',
      }
    });

    const syllabus = await prisma.syllabus.create({
      data: {
        user_id: userId,
        course_id: course.id,
        course_name: 'Imported Syllabus',
        extracted_text: rawText,
      }
    });

    const job = await syllabusQueue.add('process-syllabus', { 
      rawText,
      userId,
      courseId: course.id,
      syllabusId: syllabus.id
    });

    res.status(202).json({
      jobId: job.id,
      courseId: course.id,
      syllabusId: syllabus.id,
      status: 'queued',
    });
  });

  getJobStatus = asyncHandler(async (req: Request, res: Response) => {
    const { jobId } = req.params;

    if (!jobId) {
      res.status(400).json({ error: 'Job ID is required.' });
      return;
    }

    const job = await syllabusQueue.getJob(jobId);

    if (!job) {
      res.status(404).json({ error: 'Job not found.' });
      return;
    }

    const state = await job.getState();
    let status = 'queued';
    if (state === 'active') status = 'processing';
    if (state === 'completed') status = 'completed';
    if (state === 'failed') status = 'failed';

    if (status === 'completed') {
      res.status(200).json({
        status,
        result: job.returnvalue,
      });
      return;
    }

    res.status(200).json({
      status,
      result: null,
    });
  });
}

export const syllabiController = new SyllabiController();
