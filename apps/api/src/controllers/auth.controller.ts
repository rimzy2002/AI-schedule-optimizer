import { Request, Response } from 'express';
import * as authService from '../services/auth/auth.service';
import { AuthRequest } from '../middleware/auth.middleware';

export const register = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await authService.register(email, password);
  res.status(201).json({ status: 'success', data: result });
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  res.status(200).json({ status: 'success', data: result });
};

export const getMe = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ status: 'error', message: 'Not authenticated' });
  }
  const result = await authService.getMe(req.user.id);
  res.status(200).json({ status: 'success', data: { user: result } });
};
