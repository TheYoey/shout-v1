import React from 'react';

export function Card({ children, title, description, className = '' }) {
  return (
    <div className={`bg-white rounded-lg p-6 shadow-md mb-4 ${className}`}>
      {title && <h2 className="text-xl font-semibold mb-2">{title}</h2>}
      {description && <p className="text-gray-600 mb-4">{description}</p>}
      {children}
    </div>
  );
} 