import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, BookOpen } from 'lucide-react';
import { bookService } from '../../services/bookService';
import { categoryService } from '../../services/categoryService';
import type { Book, Category, BookSearchParams } from '../../types';
import './CatalogPage.css';

export function CatalogPage() {
  const navigate = useNavigate();
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useState<BookSearchParams>({
    q: '',
    categoryId: undefined,
    language: undefined,
    available: undefined,
    page: 1,
    size: 12,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 0,
    total: 0,
  });

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadBooks();
  }, [searchParams.page, searchParams.categoryId, searchParams.available]);

  const loadCategories = async () => {
    try {
      const response = await categoryService.listCategories();
      if (response.success) {
        setCategories(response.data);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const loadBooks = async () => {
    setLoading(true);
    try {
      const response = await bookService.searchBooks(searchParams);
      if (response.success) {
        setBooks(response.data);
        setPagination({
          page: response.page,
          totalPages: response.totalPages,
          total: response.total,
        });
      }
    } catch (err) {
      console.error('Failed to load books:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams(prev => ({ ...prev, page: 1 }));
    loadBooks();
  };

  const handleCategoryChange = (categoryId: string) => {
    setSearchParams(prev => ({
      ...prev,
      categoryId: categoryId || undefined,
      page: 1,
    }));
  };

  const handleAvailabilityToggle = () => {
    setSearchParams(prev => ({
      ...prev,
      available: prev.available === true ? undefined : true,
      page: 1,
    }));
  };

  return (
    <div className="catalog-page">
      <div className="catalog-header">
        <h1 className="page-title">Catalog</h1>
        <p className="catalog-subtitle">{pagination.total} books available</p>
      </div>

      <div className="catalog-filters">
        <form className="search-bar" onSubmit={handleSearch}>
          <Search size={20} />
          <input
            type="text"
            placeholder="Search by title, author, or ISBN..."
            value={searchParams.q || ''}
            onChange={e => setSearchParams(prev => ({ ...prev, q: e.target.value }))}
          />
          <button type="submit" className="btn-primary">Search</button>
        </form>

        <div className="filter-row">
          <div className="filter-group">
            <Filter size={16} />
            <select
              value={searchParams.categoryId || ''}
              onChange={e => handleCategoryChange(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <button
            className={`filter-toggle ${searchParams.available === true ? 'active' : ''}`}
            onClick={handleAvailabilityToggle}
          >
            Available Now
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading books...</div>
      ) : books.length === 0 ? (
        <div className="empty-state">
          <BookOpen size={48} />
          <h3>No books found</h3>
          <p>Try adjusting your search or filters</p>
        </div>
      ) : (
        <>
          <div className="book-grid">
            {books.map(book => (
              <div
                key={book.id}
                className="book-card"
                onClick={() => navigate(`/catalog/${book.id}`)}
              >
                <div className="book-cover">
                  {book.coverImageUrl ? (
                    <img src={book.coverImageUrl} alt={book.bookName} />
                  ) : (
                    <div className="cover-placeholder">
                      <BookOpen size={32} />
                    </div>
                  )}
                </div>
                <div className="book-info">
                  <h3 className="book-title">{book.bookName}</h3>
                  <p className="book-author">{book.author}</p>
                  {book.categoryName && (
                    <span className="book-category">{book.categoryName}</span>
                  )}
                  <div className="book-availability">
                    <span className={book.availableCopies > 0 ? 'available' : 'unavailable'}>
                      {book.availableCopies > 0
                        ? `${book.availableCopies} available`
                        : 'Not available'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn-secondary"
                disabled={pagination.page === 1}
                onClick={() => setSearchParams(prev => ({ ...prev, page: prev.page - 1 }))}
              >
                Previous
              </button>
              <span>
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                className="btn-secondary"
                disabled={pagination.page === pagination.totalPages}
                onClick={() => setSearchParams(prev => ({ ...prev, page: prev.page + 1 }))}
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
