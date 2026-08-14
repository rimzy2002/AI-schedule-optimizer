# AI Schedule Optimizer

AI Schedule Optimizer is a full-stack web application designed to help students automatically extract actionable tasks from raw course syllabi and generate an optimized, personalized study schedule. It utilizes AI (Google Gemini), background queues (BullMQ), and custom scheduling algorithms.

## Problem

Students spend hours at the start of every semester manually reading long PDF or text syllabi, extracting important deadlines, estimating how long tasks will take, and attempting to map them out on a calendar. This manual process is error-prone, static, and rarely adapts to actual available study time, leading to missed deadlines and burnout.

## Product Solution

1. **Extract**: Paste raw text from a syllabus, and the AI automatically extracts tasks, task types (e.g. exams, essays, quizzes), deadlines, and grade weights.
2. **Review**: The extracted tasks are presented in a dynamic UI for the student to verify, correct any hallucinations, or add missing tasks.
3. **Schedule**: A custom backward-scheduling algorithm maps out study blocks across available calendar slots, optimizing time by prioritizing tasks with closer deadlines and higher weights.
4. **Execute**: The dynamic dashboard serves the *Next Action* to complete, integrating directly into a built-in Pomodoro Focus Timer that tracks planned vs actual study time.

## Architecture

```
React / TypeScript (Frontend)
        │
        ▼
   Express API
        │
        ├──────────────► MySQL (Database)
        │
        ▼
     BullMQ
        │
        ▼
      Redis
        │
        ▼
 Syllabus Worker
        │
        ▼
     Gemini
        │
        ▼
      Zod (Validation)
        │
        ▼
 Structured Tasks
        │
        ▼
 Scheduler Algorithm
        │
        ▼
   Study Blocks
```

## Tech Stack

- **Frontend**: React, TypeScript, React Router, TailwindCSS, Vite
- **Backend**: Node.js, Express, TypeScript
- **Database**: MySQL, Prisma ORM
- **Queue**: BullMQ, Redis
- **AI**: Google Gemini Pro (via `@google/genai`)
- **Validation**: Zod
- **Testing**: Vitest

## How It Works Under The Hood

### Syllabus Extraction
Because AI API calls can take 10-30 seconds, we offload extraction to a background queue using **BullMQ** and **Redis**. When a user pastes their syllabus, the server queues the job and returns a `jobId`. The frontend polls the job status and transitions to the Review UI once the structured JSON is extracted.

### Why Zod Exists
LLMs hallucinate formats. To ensure our database isn't corrupted by bad JSON, we use Zod schemas at the application boundary. The Gemini output is strictly validated against `SyllabusExtractionSchema`. If it fails, the error is caught safely.

### Scheduling Algorithm
The application uses a custom `backwardScheduler` which:
1. Calculates a dynamic priority score using task weights and deadline proximity.
2. Traverses backward from the deadline to find available non-overlapping time slots.
3. Allocates `StudyBlocks` that respect the required study duration for each task.

### Database Structure
- **Syllabus**: Represents the raw imported text.
- **Task**: An extracted milestone (e.g., Midterm Exam).
- **StudyBlock**: An allocated time slot to work on a task.
- **FocusSession**: An execution instance tracking a running timer, pause durations, and completion time.
- **FocusMetric**: Analytical data points for productivity insights.

## Setup Instructions

### Environment Variables
Create a `.env` file in the root directory:
```env
# Database
DATABASE_URL="mysql://root:password@localhost:3306/ai_schedule_optimizer"

# Redis
REDIS_HOST="localhost"
REDIS_PORT=6379

# AI
GEMINI_API_KEY="your_api_key_here"

# Server
PORT=4000
```

### Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start a local MySQL database and Redis server (e.g. via Docker).

3. Push the database schema:
   ```bash
   npx prisma db push --workspace=packages/database
   ```

4. Start the application stack (Frontend, API, and Worker):
   ```bash
   npm run dev
   npm run worker
   ```

### Testing
Run the comprehensive integration and unit tests:
```bash
npm run test
```

## Known Limitations
- The current version uses a mocked user identity (`user-1`) for MVP purposes. Full OAuth integration is on the roadmap.
- Adaptive rescheduling (automatically shifting missed blocks) is not yet enabled in this release.

## Roadmap
- [ ] User Authentication via Auth0
- [ ] Adaptive Rescheduling for missed study blocks
- [ ] Integration with Google Calendar API
