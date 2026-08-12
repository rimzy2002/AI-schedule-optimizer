import { Request, Response } from 'express';
import { syllabusQueue } from '../queues/syllabus.queue';

export class SyllabiController {
  async extractSyllabus(req: Request, res: Response) {
    const { rawText } = req.body;

    if (!rawText || typeof rawText !== 'string' || rawText.trim() === '') {
      return res.status(400).json({ error: 'Valid rawText is required.' });
    }

    const job = await syllabusQueue.add('process-syllabus', { rawText });

    return res.status(202).json({
      jobId: job.id,
      status: 'queued',
    });
  }

  async getJobStatus(req: Request, res: Response) {
    const { jobId } = req.params;

    if (!jobId) {
      return res.status(400).json({ error: 'Job ID is required.' });
    }

    const job = await syllabusQueue.getJob(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found.' });
    }

    const state = await job.getState();
    // BullMQ states: active, completed, failed, delayed, waiting, waiting-children, priorized, etc.
    let status = 'queued';
    if (state === 'active') status = 'processing';
    if (state === 'completed') status = 'completed';
    if (state === 'failed') status = 'failed';

    if (status === 'completed') {
      return res.status(200).json({
        status,
        result: job.returnvalue,
      });
    }

    return res.status(200).json({
      status,
      result: null,
    });
  }
}

export const syllabiController = new SyllabiController();
