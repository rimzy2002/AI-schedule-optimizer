import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';

export const SettingsPage: React.FC = () => {
  const [dailyGoal, setDailyGoal] = useState('2');
  const [theme, setTheme] = useState('dark');

  return (
    <div className="max-w-2xl mx-auto py-12">
      <header className="page-header mb-8">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your preferences and application settings.</p>
      </header>

      <div className="flex flex-col gap-8">
        <Card>
          <h2 className="text-h2 text-primary mb-6">Study Preferences</h2>
          <div className="flex flex-col gap-6">
            <Input 
              label="Daily Study Goal (Hours)" 
              type="number" 
              value={dailyGoal}
              onChange={(e) => setDailyGoal(e.target.value)}
            />
          </div>
        </Card>

        <Card>
          <h2 className="text-h2 text-primary mb-6">Appearance</h2>
          <div className="flex flex-col gap-6">
            <Select 
              label="Theme" 
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              options={[
                { label: 'Dark (Default)', value: 'dark' },
                { label: 'Light', value: 'light' },
                { label: 'System', value: 'system' }
              ]}
            />
          </div>
        </Card>
        
        <div className="flex justify-end mt-4">
          <Button variant="primary">Save Changes</Button>
        </div>
      </div>
    </div>
  );
};
