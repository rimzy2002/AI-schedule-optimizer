import { Request, Response } from 'express';
import { prisma } from '@ai-schedule-optimizer/database';
import { syllabusQueue } from '../queues/syllabus.queue';
import { extractSyllabusSchema } from '../schemas/syllabi.schema';
import { asyncHandler } from '../utils/asyncHandler';

export class SyllabiController {
  extractSyllabus = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required' });
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
        analysis_status: 'pending',
      }
    });

    let job;
    try {
      job = await syllabusQueue.add('process-syllabus', { 
        rawText,
        userId,
        courseId: course.id,
        syllabusId: syllabus.id
      });
    } catch (queueErr: unknown) {
      const errMessage = queueErr instanceof Error ? queueErr.message : String(queueErr);
      console.error('Queue error:', errMessage);
      await prisma.syllabus.update({
        where: { id: syllabus.id },
        data: { analysis_status: 'failed' }
      }).catch(console.error);

      return res.status(503).json({
        error: 'Failed to enqueue syllabus processing. Background queue service is unavailable.',
      });
    }

    res.status(202).json({
      jobId: job.id,
      courseId: course.id,
      syllabusId: syllabus.id,
      status: 'queued',
    });
  });

  getJobStatus = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }

    const { jobId } = req.params;
    if (!jobId) {
      res.status(400).json({ error: 'Job ID is required.' });
      return;
    }

    const job = await syllabusQueue.getJob(jobId);
    if (!job) {
      // Check if there is a syllabus record with this id as fallback
      const syllabus = await prisma.syllabus.findUnique({
        where: { id: jobId, user_id: userId }
      });
      if (syllabus) {
        return res.status(200).json({
          status: syllabus.analysis_status,
          result: syllabus.analysis_status === 'completed' ? { course: syllabus.course_name, courseId: syllabus.course_id } : null,
          error: syllabus.analysis_status === 'failed' ? 'Syllabus processing failed.' : null,
          courseId: syllabus.course_id,
        });
      }

      res.status(404).json({ error: 'Job not found.' });
      return;
    }

    // Ownership check for the queue job
    if (job.data?.userId && job.data.userId !== userId) {
      return res.status(403).json({ error: 'Access denied: You do not own this job' });
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
        courseId: job.data?.courseId,
        syllabusId: job.data?.syllabusId,
      });
      return;
    }

    if (status === 'failed') {
      res.status(200).json({
        status,
        result: null,
        error: job.failedReason || 'Unknown error occurred during processing',
      });
      return;
    }

    res.status(200).json({
      status,
      result: null,
      courseId: job.data?.courseId,
      syllabusId: job.data?.syllabusId,
    });
  });

  getSyllabusStatus = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }

    const { id } = req.params;
    const syllabus = await prisma.syllabus.findFirst({
      where: { id, user_id: userId }
    });

    if (!syllabus) {
      return res.status(404).json({ error: 'Syllabus not found' });
    }

    res.json({
      id: syllabus.id,
      courseId: syllabus.course_id,
      courseName: syllabus.course_name,
      status: syllabus.analysis_status,
      extractedText: syllabus.extracted_text,
      createdAt: syllabus.created_at,
    });
  });

  getActiveImport = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }

    const syllabus = await prisma.syllabus.findFirst({
      where: {
        user_id: userId,
        analysis_status: { in: ['pending', 'processing'] }
      },
      orderBy: { created_at: 'desc' }
    });

    res.json(syllabus ? {
      syllabusId: syllabus.id,
      courseId: syllabus.course_id,
      courseName: syllabus.course_name,
      status: syllabus.analysis_status,
      extractedText: syllabus.extracted_text,
    } : null);
  });
}

export const syllabiController = new SyllabiController();
