import React from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  onChange?: (rating: number) => void;
  size?: number;
  className?: string;
}

const StarRating: React.FC<StarRatingProps> = ({ rating, onChange, size = 16, className = '' }) => (
  <div className={`flex items-center gap-1 ${className}`}>
    {Array.from({ length: 5 }).map((_, index) => {
      const value = index + 1;
      const filled = value <= rating;
      const Component = (
        <Star
          size={size}
          fill={filled ? 'currentColor' : 'none'}
          className={filled ? 'text-amber-400' : 'text-slate-300'}
        />
      );

      if (!onChange) {
        return <span key={value}>{Component}</span>;
      }

      return (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          className="transition hover:scale-105"
          aria-label={`${value} etoiles`}
        >
          {Component}
        </button>
      );
    })}
  </div>
);

export default StarRating;
