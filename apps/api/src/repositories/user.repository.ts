import { prisma } from '../config/database';

export const findUserByEmail = async (email: string) => {
  return prisma.user.findUnique({
    where: { email },
  });
};

export const findUserById = async (id: string) => {
  return prisma.user.findUnique({
    where: { id },
  });
};

export const createUser = async (email: string, password_hash: string) => {
  return prisma.user.create({
    data: {
      email,
      password_hash,
    },
  });
};
