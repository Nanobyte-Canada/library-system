import { cn } from '../../lib/utils';
import type { Book } from '../../types';
import './BookCard.css';

const GRADIENT_CLASSES = [
  'green-gradient',
  'red-gradient',
  'amber-gradient',
  'blue-gradient',
  'brown-gradient',
  'teal-gradient',
  'purple-gradient',
  'slate-gradient',
];

interface BookCardProps {
  book: Book;
  index?: number;
  onClick?: () => void;
}

export function BookCard({ book, index = 0, onClick }: BookCardProps) {
  return (
    <div className="catalog-book-card" onClick={onClick}>
      <div className="catalog-book-cover">
        {book.coverImageUrl ? (
          <img src={book.coverImageUrl} alt={book.bookName} />
        ) : (
          <div className={cn('book-cover-placeholder', GRADIENT_CLASSES[index % GRADIENT_CLASSES.length])}>
            {book.bookName}
          </div>
        )}
      </div>
      <div className="catalog-book-info">
        <h3 className="catalog-book-title">{book.bookName}</h3>
        <p className="catalog-book-author">{book.author}</p>
        {book.categoryName && (
          <span className="catalog-book-category">{book.categoryName}</span>
        )}
        <div className="catalog-book-availability">
          <span className={cn('badge', book.availableCopies > 0 ? 'badge-success' : 'badge-danger')}>
            {book.availableCopies > 0 ? `${book.availableCopies} available` : 'Not available'}
          </span>
        </div>
      </div>
    </div>
  );
}
