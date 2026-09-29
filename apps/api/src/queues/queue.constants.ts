import { env } from '../config/env';

export const QUEUE_NAMES = {
  SYLLABUS_PROCESSING: env.redis.queueName,
};
