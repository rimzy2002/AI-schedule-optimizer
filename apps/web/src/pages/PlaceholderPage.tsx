import React from 'react';
export const PlaceholderPage: React.FC<{ title: string }> = ({ title }) => (
  <div><h1 className="text-2xl font-bold">{title}</h1><p className="text-secondary mt-2">Work in progress...</p></div>
);
