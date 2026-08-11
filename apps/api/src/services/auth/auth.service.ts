import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import * as userRepository from '../../repositories/user.repository';
import { AppError } from '../../utils/AppError';

export const register = async (email: string, passwordRaw: string) => {
  const existingUser = await userRepository.findUserByEmail(email);
  if (existingUser) {
    throw new AppError('Email already in use', 400);
  }

  const saltRounds = 10;
  const passwordHash = await bcrypt.hash(passwordRaw, saltRounds);

  const user = await userRepository.createUser(email, passwordHash);

  const token = jwt.sign({ id: user.id }, env.jwtSecret, {
    expiresIn: '7d',
  });

  return {
    user: { id: user.id, email: user.email },
    token,
  };
};

export const login = async (email: string, passwordRaw: string) => {
  const user = await userRepository.findUserByEmail(email);
  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  const isPasswordValid = await bcrypt.compare(passwordRaw, user.password_hash);
  if (!isPasswordValid) {
    throw new AppError('Invalid credentials', 401);
  }

  const token = jwt.sign({ id: user.id }, env.jwtSecret, {
    expiresIn: '7d',
  });

  return {
    user: { id: user.id, email: user.email },
    token,
  };
};

export const getMe = async (id: string) => {
  const user = await userRepository.findUserById(id);
  if (!user) {
    throw new AppError('User not found', 404);
  }
  return { id: user.id, email: user.email };
};
