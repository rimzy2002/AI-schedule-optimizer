import { prisma } from '@ai-schedule-optimizer/database';
import { ScheduledBlock } from '../../algorithms/scheduling/backwardScheduler';

export class StudyBlockService {
  /**
   * Saves generated study blocks to the database.
   */
  async saveBlocks(userId: string, blocks: ScheduledBlock[]): Promise<number> {
    const created = await prisma.$transaction(
      blocks.map(b => 
        prisma.studyBlock.create({
          data: {
            user_id: userId,
            task_id: b.taskId,
            title: `Study: ${b.taskTitle}`,
            start_time: b.start,
            end_time: b.end,
          }
        })
      )
    );
    return created.length;
  }
}

export const studyBlockService = new StudyBlockService();
