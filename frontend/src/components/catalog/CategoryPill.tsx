import { cn } from '../../lib/utils';
import './CategoryPill.css';

interface CategoryPillProps {
  name: string;
  active?: boolean;
  onClick?: () => void;
}

export function CategoryPill({ name, active, onClick }: CategoryPillProps) {
  return (
    <button
      className={cn('category-pill', active && 'active')}
      onClick={onClick}
      type="button"
    >
      {name}
    </button>
  );
}
