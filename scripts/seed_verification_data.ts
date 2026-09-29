import { prisma } from '@ai-schedule-optimizer/database';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

async function seed() {
  if (process.env.NODE_ENV === 'production') {
    console.error('ERROR: Seeding verification test data is strictly prohibited in production mode.');
    process.exit(1);
  }

  console.log('Seeding isolated verification test data...');

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // User 1
  let user1 = await prisma.user.findUnique({ where: { email: 'persist_user1@example.com' } });
  if (!user1) {
    user1 = await prisma.user.create({
      data: {
        email: 'persist_user1@example.com',
        password_hash: passwordHash,
      },
    });
  }

  // User 2
  let user2 = await prisma.user.findUnique({ where: { email: 'persist_user2@example.com' } });
  if (!user2) {
    user2 = await prisma.user.create({
      data: {
        email: 'persist_user2@example.com',
        password_hash: passwordHash,
      },
    });
  }

  // Clean only user1's existing data to ensure idempotent run
  await prisma.studyBlock.deleteMany({ where: { user_id: user1.id } });
  await prisma.schedule.deleteMany({ where: { user_id: user1.id } });
  await prisma.task.deleteMany({ where: { course: { user_id: user1.id } } });
  await prisma.syllabus.deleteMany({ where: { user_id: user1.id } });
  await prisma.course.deleteMany({ where: { user_id: user1.id } });

  // Clean user2's data
  await prisma.studyBlock.deleteMany({ where: { user_id: user2.id } });
  await prisma.schedule.deleteMany({ where: { user_id: user2.id } });
  await prisma.task.deleteMany({ where: { course: { user_id: user2.id } } });
  await prisma.syllabus.deleteMany({ where: { user_id: user2.id } });
  await prisma.course.deleteMany({ where: { user_id: user2.id } });

  // Course 1 for User 1
  const course1 = await prisma.course.create({
    data: {
      user_id: user1.id,
      title: 'CS 501: Operating Systems & Concurrency',
      course_code: 'CS501',
      instructor: 'Dr. Alan Turing',
      semester: 'Fall 2026',
    },
  });

  // Task 1: Weekday (Wednesday, Oct 7, 2026, 18:00:00+05:30) - Timed
  const task1 = await prisma.task.create({
    data: {
      course_id: course1.id,
      title: 'Lab 1: Concurrency Kernel',
      description: 'Implement mutual exclusion locks and semaphores',
      deadline: new Date('2026-10-07T12:30:00.000Z'), // 18:00 in +05:30
      is_date_only: false,
      estimated_duration: 120,
      weight: 15,
      status: 'pending',
    },
  });

  // Task 2: Same weekday different week (Wednesday, Oct 14, 2026, 18:00:00+05:30) - Timed
  const task2 = await prisma.task.create({
    data: {
      course_id: course1.id,
      title: 'Lab 2: Memory Allocator',
      description: 'Implement slab memory allocation algorithm',
      deadline: new Date('2026-10-14T12:30:00.000Z'), // 18:00 in +05:30
      is_date_only: false,
      estimated_duration: 120,
      weight: 15,
      status: 'pending',
    },
  });

  // Task 3: Saturday (Saturday, Oct 10, 2026) - Date-only
  const task3 = await prisma.task.create({
    data: {
      course_id: course1.id,
      title: 'Weekend Essay: Distributed Consensus',
      description: 'Analyze Raft vs Paxos trade-offs',
      deadline: new Date('2026-10-10T00:00:00.000Z'),
      is_date_only: true,
      estimated_duration: 90,
      weight: 10,
      status: 'pending',
    },
  });

  // Task 4: Sunday (Sunday, Oct 11, 2026, 20:00:00+05:30) - Timed
  const task4 = await prisma.task.create({
    data: {
      course_id: course1.id,
      title: 'Sunday Code Review',
      description: 'Peer review kernel pull requests',
      deadline: new Date('2026-10-11T14:30:00.000Z'), // 20:00 in +05:30
      is_date_only: false,
      estimated_duration: 60,
      weight: 10,
      status: 'pending',
    },
  });

  // Task 5: Draft task with unknown / null deadline (Savable without scheduling)
  const task5 = await prisma.task.create({
    data: {
      course_id: course1.id,
      title: 'Draft Term Paper Outline',
      description: 'Brainstorm topic ideas and preliminary references',
      deadline: null,
      is_date_only: false,
      estimated_duration: 90,
      weight: 5,
      status: 'draft',
    },
  });

  // Course 2 for User 1
  const course2 = await prisma.course.create({
    data: {
      user_id: user1.id,
      title: 'MATH 302: Linear Algebra & Optimization',
      course_code: 'MATH302',
      instructor: 'Prof. Gilbert Strang',
      semester: 'Fall 2026',
    },
  });

  // Task for Course 2: Weekday (Friday, Oct 9, 2026) - Date-only
  await prisma.task.create({
    data: {
      course_id: course2.id,
      title: 'Problem Set 1: Eigenvalues',
      description: 'Exercises 1-15 on spectral decomposition',
      deadline: new Date('2026-10-09T00:00:00.000Z'),
      is_date_only: true,
      estimated_duration: 90,
      weight: 20,
      status: 'pending',
    },
  });

  // Course 1 for User 2 (Isolated user)
  const courseUser2 = await prisma.course.create({
    data: {
      user_id: user2.id,
      title: 'BIO 101: General Biology',
      course_code: 'BIO101',
      instructor: 'Dr. Jane Goodall',
      semester: 'Fall 2026',
    },
  });

  await prisma.task.create({
    data: {
      course_id: courseUser2.id,
      title: 'Cell Division Lab Report',
      description: 'Mitosis vs meiosis observations',
      deadline: new Date('2026-10-12T12:00:00.000Z'),
      is_date_only: false,
      estimated_duration: 60,
      weight: 10,
      status: 'pending',
    },
  });

  // Generate an initial schedule for User 1
  const schedule1 = await prisma.schedule.create({
    data: {
      user_id: user1.id,
      course_id: course1.id,
      status: 'active',
    },
  });

  // Create study blocks spanning weekdays, Saturday, Sunday, and across multiple weeks
  // Block 1: Wednesday Oct 7, 2026 (09:00 - 11:00 in Colombo / 03:30 - 05:30 UTC)
  await prisma.studyBlock.create({
    data: {
      schedule_id: schedule1.id,
      user_id: user1.id,
      course_id: course1.id,
      task_id: task1.id,
      title: 'Study: Lab 1: Concurrency Kernel',
      start_time: new Date('2026-10-07T03:30:00.000Z'),
      end_time: new Date('2026-10-07T05:30:00.000Z'),
      status: 'pending',
    },
  });

  // Block 2: Saturday Oct 10, 2026 (10:00 - 11:30 in Colombo / 04:30 - 06:00 UTC) - Saturday weekend!
  await prisma.studyBlock.create({
    data: {
      schedule_id: schedule1.id,
      user_id: user1.id,
      course_id: course1.id,
      task_id: task3.id,
      title: 'Study: Weekend Essay: Distributed Consensus',
      start_time: new Date('2026-10-10T04:30:00.000Z'),
      end_time: new Date('2026-10-10T06:00:00.000Z'),
      status: 'pending',
    },
  });

  // Block 3: Sunday Oct 11, 2026 (14:00 - 15:00 in Colombo / 08:30 - 09:30 UTC) - Sunday weekend!
  await prisma.studyBlock.create({
    data: {
      schedule_id: schedule1.id,
      user_id: user1.id,
      course_id: course1.id,
      task_id: task4.id,
      title: 'Study: Sunday Code Review',
      start_time: new Date('2026-10-11T08:30:00.000Z'),
      end_time: new Date('2026-10-11T09:30:00.000Z'),
      status: 'completed', // Marked as completed to verify completed vs pending display
    },
  });

  // Block 4: Wednesday Oct 14, 2026 (09:00 - 11:00 in Colombo / 03:30 - 05:30 UTC) - Same weekday in different week!
  await prisma.studyBlock.create({
    data: {
      schedule_id: schedule1.id,
      user_id: user1.id,
      course_id: course1.id,
      task_id: task2.id,
      title: 'Study: Lab 2: Memory Allocator',
      start_time: new Date('2026-10-14T03:30:00.000Z'),
      end_time: new Date('2026-10-14T05:30:00.000Z'),
      status: 'pending',
    },
  });

  // Generate tokens for both users
  const token1 = jwt.sign({ id: user1.id, email: user1.email }, JWT_SECRET, { expiresIn: '7d' });
  const token2 = jwt.sign({ id: user2.id, email: user2.email }, JWT_SECRET, { expiresIn: '7d' });

  console.log('Seeding completed successfully!');
  console.log(JSON.stringify({
    user1: { id: user1.id, email: user1.email, token: token1, course1Id: course1.id, course2Id: course2.id, scheduleId: schedule1.id },
    user2: { id: user2.id, email: user2.email, token: token2, courseId: courseUser2.id }
  }, null, 2));

  await prisma.$disconnect();
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
