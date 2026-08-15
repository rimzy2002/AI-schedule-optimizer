import React from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useNavigate } from 'react-router-dom';

export const SyllabusImportCard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Card className="bg-surface border-subtle border p-6 flex flex-col items-start h-full">
      <div className="flex-grow">
        <h3 className="text-h3 font-bold text-primary mb-2">Add a course automatically</h3>
        <p className="text-secondary text-sm mb-6">
          Paste your syllabus and let AI extract deadlines.
        </p>
      </div>
      <Button className="w-full sm:w-auto font-bold py-2 px-6 bg-border-subtle hover:bg-border-strong text-primary rounded-md" onClick={() => navigate('/import')}>
        Import syllabus
      </Button>
    </Card>
  );
};
