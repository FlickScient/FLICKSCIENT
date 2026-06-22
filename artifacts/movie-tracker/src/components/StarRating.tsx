// @ts-nocheck
import { Star } from 'lucide-react';

export default function StarRating({ value, onChange }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(star => (
        <button key={star} onClick={() => onChange(star === value ? 0 : star)}
          className={`transition-colors ${star <= (value||0) ? 'text-yellow-500' : 'text-gray-700'} hover:text-yellow-400`}>
          <Star size={12} fill={star <= (value||0) ? 'currentColor' : 'none'} strokeWidth={1.5} />
        </button>
      ))}
    </div>
  );
}
