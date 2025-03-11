import React from 'react';

interface BrainProfileProps {
  className?: string;
  size?: number;
}

export const BrainProfile: React.FC<BrainProfileProps> = ({ 
  className = "", 
  size = 24 
}) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="1.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      {/* Profile view of brain - side view */}
      {/* Frontal lobe */}
      <path d="M18 7.5c1.5-1 2-2.5 2-4C20 2 18.5 1 17 1c-1.5 0-2.5 1-3 2" />
      <path d="M14 3c-0.5-1-1.5-2-3-2C9.5 1 8 2 8 3.5c0 1.5 1 2.5 2 3" />
      
      {/* Top of brain */}
      <path d="M10 6.5c-1.5 0-2.5 1-2.5 2.5c0 1.5 1 2.5 2 3" />
      <path d="M14 6.5c1.5 0 2.5 1 2.5 2.5c0 1.5-1 2.5-2 3" />
      
      {/* Temporal lobe */}
      <path d="M9.5 12c-1.5 0-2.5 1-2.5 2.5c0 1.5 1 2.5 2 3" />
      <path d="M14.5 12c1.5 0 2.5 1 2.5 2.5c0 1.5-1 2.5-2 3" />
      
      {/* Cerebellum */}
      <path d="M9 17.5c-1.5 0-3 1-3 2.5c0 1.5 1.5 2.5 3 2.5c1.5 0 2-1 2-2" />
      <path d="M15 17.5c1.5 0 3 1 3 2.5c0 1.5-1.5 2.5-3 2.5c-1.5 0-2-1-2-2" />
      
      {/* Brain stem */}
      <path d="M11 18.5v3c0 1-0.5 1.5-1.5 1.5" />
      <path d="M13 18.5v3c0 1 0.5 1.5 1.5 1.5" />
      
      {/* Connecting curves */}
      <path d="M9.5 3.5c0.5 1 1.5 2 2.5 2c1 0 2-1 2.5-2" />
      <path d="M9.5 9c0.5 1 1.5 2 2.5 2c1 0 2-1 2.5-2" />
      <path d="M9.5 14.5c0.5 1 1.5 2 2.5 2c1 0 2-1 2.5-2" />
      <path d="M11 17.5c0.5 0 1 0 2 0" />
    </svg>
  );
};

export default BrainProfile;
