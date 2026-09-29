import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { apiClient } from '../services/apiClient';
import { Settings as SettingsIcon, CheckCircle2, AlertCircle, Info } from 'lucide-react';

const COMMON_TIMEZONES = [
  { value: 'Asia/Colombo', label: 'Asia/Colombo (UTC+05:30)' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'America/New_York (Eastern Time)' },
  { value: 'America/Chicago', label: 'America/Chicago (Central Time)' },
  { value: 'America/Denver', label: 'America/Denver (Mountain Time)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (Pacific Time)' },
  { value: 'Europe/London', label: 'Europe/London (GMT / BST)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (Central European Time)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST UTC+04:00)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT UTC+08:00)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST UTC+09:00)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST UTC+10:00)' },
];

export const SettingsPage: React.FC = () => {
  const [timezone, setTimezone] = useState('Asia/Colombo');
  const [startHour, setStartHour] = useState(8);
  const [endHour, setEndHour] = useState(22);
  const [maxSessionDuration, setMaxSessionDuration] = useState(90);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await apiClient.get('/settings');
        if (data) {
          if (data.timezone) setTimezone(data.timezone);
          if (data.startHour !== undefined) setStartHour(data.startHour);
          if (data.endHour !== undefined) setEndHour(data.endHour);
          if (data.maxSessionDuration !== undefined) setMaxSessionDuration(data.maxSessionDuration);
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to load user settings');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSaveSuccess(false);

    if (startHour >= endHour) {
      setErrorMessage('Daily study start hour must be strictly before end hour.');
      return;
    }

    setIsSaving(true);
    try {
      await apiClient.put('/settings', {
        timezone,
        startHour,
        endHour,
        maxSessionDuration,
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const hourOptions = Array.from({ length: 25 }, (_, i) => {
    const hour12 = i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`;
    const padded = String(i).padStart(2, '0');
    return { value: String(i), label: `${padded}:00 (${hour12})` };
  });

  if (isLoading) {
    return (
      <div className="py-12 max-w-2xl mx-auto text-center text-secondary">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent mb-3" />
        <p>Loading preferences...</p>
      </div>
    );
  }

  return (
    <div className="py-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-surface border border-subtle flex items-center justify-center text-primary">
          <SettingsIcon size={22} />
        </div>
        <div>
          <h1 className="page-title mb-0">Study Settings</h1>
          <p className="page-subtitle mb-0">
            Configure your active study timezone and daily study availability.
          </p>
        </div>
      </div>

      <Card className="p-8">
        <form onSubmit={handleSave} className="flex flex-col gap-6">
          {errorMessage && (
            <div className="p-4 bg-error-subtle border border-error text-error text-sm rounded-lg flex items-center gap-2">
              <AlertCircle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="p-4 bg-success-subtle border border-success text-success text-sm rounded-lg flex items-center gap-2">
              <CheckCircle2 size={18} />
              <span>Settings saved successfully! Newly generated schedules will use these parameters.</span>
            </div>
          )}

          <div className="p-4 bg-surface border border-subtle rounded-lg text-xs text-secondary flex items-start gap-2.5">
            <Info size={16} className="text-primary flex-shrink-0 mt-0.5" />
            <p className="m-0 leading-relaxed">
              These preferences configure the boundaries for AI schedule optimization. Existing schedules and study blocks are preserved as-is. To apply changes to an existing course, regenerate its schedule.
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-primary mb-2">
              Study Timezone
            </label>
            <Select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              options={COMMON_TIMEZONES}
            />
            <p className="text-xs text-muted mt-1.5">
              All daily windows, deadline cutoffs, and calendar days align with this local timezone.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                Daily Study Start Hour
              </label>
              <Select
                value={String(startHour)}
                onChange={(e) => setStartHour(parseInt(e.target.value, 10))}
                options={hourOptions.slice(0, 24)}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-primary mb-2">
                Daily Study End Hour
              </label>
              <Select
                value={String(endHour)}
                onChange={(e) => setEndHour(parseInt(e.target.value, 10))}
                options={hourOptions.slice(1, 25)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-primary mb-2">
              Max Continuous Session Duration (minutes)
            </label>
            <Input
              type="number"
              min={15}
              max={240}
              step={15}
              value={String(maxSessionDuration)}
              onChange={(e) => setMaxSessionDuration(parseInt(e.target.value, 10) || 60)}
            />
            <p className="text-xs text-muted mt-1.5">
              Recommended: 60 to 90 minutes with short breaks between blocks.
            </p>
          </div>

          <div className="pt-4 border-t border-subtle flex justify-end items-center gap-3">
            <Button
              type="submit"
              variant="primary"
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Preferences'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};
