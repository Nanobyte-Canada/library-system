import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Search } from 'lucide-react';
import { bookService } from '../../services/bookService';
import type { Book } from '../../types';
import './BookListPage.css';

export function BookListPage() {
  const navigate = useNavigate();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const loadBooks = useCallback(async () => {
    setLoading(true);
    try {
      const response = await bookService.listBooks(currentPage, 20);
      if (response.success) {
        setBooks(response.data);
        setTotalPages(response.totalPages);
      }
    } catch (error) {
      console.error('Failed to load books:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  const filteredBooks = useMemo(() => {
    if (!searchQuery.trim()) return books;
    const q = searchQuery.toLowerCase();
    return books.filter(
      (book) =>
        book.bookName.toLowerCase().includes(q) ||
        book.author.toLowerCase().includes(q) ||
        book.isbn.toLowerCase().includes(q) ||
        (book.categoryName && book.categoryName.toLowerCase().includes(q))
    );
  }, [books, searchQuery]);

  const renderCover = (book: Book, className: string) => (
    <div className={className}>
      {book.coverImageUrl ? (
        <img src={book.coverImageUrl} alt={book.bookName} />
      ) : (
        <BookPlaceholder />
      )}
    </div>
  );

  return (
    <div className="admin-books-page">
      <div className="admin-page-header">
        <h1>Books</h1>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/admin/books/new')}
        >
          <Plus size={16} />
          Add Book
        </button>
      </div>

      <div className="search-filter-bar">
        <input
          type="text"
          placeholder="Search by title, author, ISBN, or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-10)' }}>
          <div className="spinner" />
        </div>
      ) : filteredBooks.length === 0 ? (
        <div className="empty-state">
          <Search size={48} />
          <p>{searchQuery ? 'No books match your search.' : 'No books found.'}</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <table className="book-table">
            <thead>
              <tr>
                <th>Cover</th>
                <th>Title</th>
                <th>Author</th>
                <th>ISBN</th>
                <th>Category</th>
                <th>Language</th>
                <th>Available</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBooks.map((book) => (
                <tr key={book.id}>
                  <td>{renderCover(book, 'book-table-cover')}</td>
                  <td>
                    <strong style={{ cursor: 'pointer', color: 'var(--color-primary)' }} onClick={() => navigate(`/admin/books/${book.id}`)}>
                      {book.bookName}
                    </strong>
                  </td>
                  <td>{book.author}</td>
                  <td>{book.isbn}</td>
                  <td>{book.categoryName || '—'}</td>
                  <td>{book.language}</td>
                  <td>
                    <span className={book.availableCopies > 0 ? 'badge badge-success' : 'badge badge-danger'}>
                      {book.availableCopies} / {book.totalCopies}
                    </span>
                  </td>
                  <td>
                    <div className="book-table-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/admin/books/${book.id}`)} title="Edit">
                        <Pencil size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Mobile card layout */}
          <div className="book-cards">
            {filteredBooks.map((book) => (
              <div className="book-card-item" key={book.id}>
                <div className="book-card-header">
                  {renderCover(book, 'book-card-cover')}
                  <div className="book-card-info">
                    <h3 onClick={() => navigate(`/admin/books/${book.id}`)} style={{ cursor: 'pointer' }}>
                      {book.bookName}
                    </h3>
                    <p>{book.author}</p>
                  </div>
                </div>
                <div className="book-card-meta">
                  <span className={book.availableCopies > 0 ? 'badge badge-success' : 'badge badge-danger'}>
                    {book.availableCopies} / {book.totalCopies} available
                  </span>
                  <div className="book-card-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/admin/books/${book.id}`)} title="Edit">
                      <Pencil size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn btn-outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => prev - 1)}
              >
                Previous
              </button>
              <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                className="btn btn-outline"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => prev + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function BookPlaceholder() {
  return (
    <svg width="20" height="24" viewBox="0 0 20 24" fill="none">
      <rect x="1" y="1" width="18" height="22" rx="2" stroke="var(--color-border)" strokeWidth="1.5" fill="none" />
      <line x1="5" y1="7" x2="15" y2="7" stroke="var(--color-border)" strokeWidth="1" />
      <line x1="5" y1="10" x2="12" y2="10" stroke="var(--color-border)" strokeWidth="1" />
      <line x1="5" y1="13" x2="14" y2="13" stroke="var(--color-border)" strokeWidth="1" />
    </svg>
  );
}
