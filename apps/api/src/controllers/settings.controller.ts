import { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { settingsService } from '../services/settings.service';

function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const updateSettingsSchema = z.object({
  timezone: z.string().refine(isValidTimezone, {
    message: 'Invalid IANA timezone identifier (e.g. Asia/Colombo, America/New_York, UTC)',
  }).optional(),
  startHour: z.number().int().min(0).max(23).optional(),
  endHour: z.number().int().min(1).max(24).optional(),
  maxSessionDuration: z.number().int().min(15).max(240).optional(),
}).superRefine((data, ctx) => {
  if (data.startHour !== undefined && data.endHour !== undefined) {
    if (data.startHour >= data.endHour) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Daily study start hour must be strictly before end hour',
        path: ['endHour'],
      });
    }
  }
});

export const getSettings = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const preferences = await settingsService.getPreferences(userId);
  res.json(preferences);
});

export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const result = updateSettingsSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid settings input', details: result.error.format() });
  }

  // Cross-field validation with existing values if only one hour was passed
  const current = await settingsService.getPreferences(userId);
  const effectiveStart = result.data.startHour !== undefined ? result.data.startHour : current.startHour;
  const effectiveEnd = result.data.endHour !== undefined ? result.data.endHour : current.endHour;

  if (effectiveStart >= effectiveEnd) {
    return res.status(400).json({
      error: 'Daily study start hour must be strictly before end hour',
      details: { endHour: { _errors: ['End hour must be after start hour'] } }
    });
  }

  try {
    const updated = await settingsService.updatePreferences(userId, result.data);
    res.json({
      message: 'Settings updated successfully. Changes will apply to newly generated schedules.',
      settings: updated,
    });
  } catch (err: any) {
    console.error('Failed to commit user settings:', err);
    res.status(500).json({
      error: 'Failed to save settings to the database. Please try again.',
      details: err.message,
    });
  }
});
