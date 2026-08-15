import { PrismaClient } from '@ai-schedule-optimizer/database';
const prisma = new PrismaClient();

async function run() {
  const user = await prisma.user.findFirst();
  if (!user) throw new Error("No user");
  const syllabus = await prisma.syllabus.create({
    data: { user_id: user.id, course_name: "Test" }
  });
  console.log("Syllabus ID:", syllabus.id);
  const tasks = [{ name: 'Test Task', type: 'assignment', weight: 10, deadline: new Date("2026-10-16T00:00:00.000Z") }];
  
  await prisma.task.create({
    data: {
      syllabus_id: syllabus.id,
      title: tasks[0].name,
      deadline: tasks[0].deadline,
      weight: tasks[0].weight,
      status: 'pending',
    }
  });
  
  const fetchedTasks = await prisma.task.findMany({ where: { syllabus_id: syllabus.id } });
  console.log("Fetched Tasks:", fetchedTasks);
  
  const res = await fetch("http://localhost:3000/api/schedule/preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ syllabusId: syllabus.id })
  });
  const data = await res.json();
  console.log("Schedule Data:", data);
}
run().catch(console.error).finally(() => prisma.$disconnect());
