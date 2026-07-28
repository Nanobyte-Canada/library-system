import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, MapPin, Clock, Bookmark } from 'lucide-react';
import { bookService } from '../../services/bookService';
import { reservationService } from '@/services/reservationService';
import { branchService, Branch } from '@/services/branchService';
import type { Book, BookCopyResponse } from '../../types';
import './BookDetailPage.css';

export function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [copies, setCopies] = useState<BookCopyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [reserveLoading, setReserveLoading] = useState(false);
  const [reserveSuccess, setReserveSuccess] = useState('');
  const [reserveError, setReserveError] = useState('');

  useEffect(() => {
    if (id) {
      loadBookDetail(id);
    }
    branchService.getAllBranches().then(res => {
      if (res.success && res.data) {
        setBranches(res.data);
      }
    });
  }, [id]);

  const loadBookDetail = async (bookId: string) => {
    setLoading(true);
    try {
      const [bookResponse, copiesResponse] = await Promise.all([
        bookService.getBook(bookId),
        bookService.getCopies(bookId),
      ]);

      if (bookResponse.success && bookResponse.data) {
        setBook(bookResponse.data);
      } else {
        setError('Book not found');
      }

      if (copiesResponse.success && copiesResponse.data) {
        setCopies(copiesResponse.data);
      }
    } catch (err) {
      setError('Failed to load book details');
    } finally {
      setLoading(false);
    }
  };

  const handleReserve = async () => {
    if (!id || !selectedBranchId) return;
    setReserveLoading(true);
    setReserveError('');
    setReserveSuccess('');
    try {
      const response = await reservationService.reserveBook(id, selectedBranchId);
      if (response.success) {
        setReserveSuccess('Reservation placed successfully!');
        setSelectedBranchId('');
      } else {
        setReserveError(response.message || 'Failed to reserve book');
      }
    } catch (err) {
      setReserveError('Failed to reserve book');
    } finally {
      setReserveLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading book details...</div>;
  }

  if (error || !book) {
    return (
      <div className="error-state">
        <p>{error || 'Book not found'}</p>
        <button className="btn-secondary" onClick={() => navigate('/catalog')}>
          Back to Catalog
        </button>
      </div>
    );
  }

  // Group copies by branch
  const copiesByBranch = copies.reduce((acc, copy) => {
    const branchId = copy.branchId;
    if (!acc[branchId]) {
      acc[branchId] = {
        branchName: copy.branchName,
        total: 0,
        available: 0,
      };
    }
    acc[branchId].total++;
    if (copy.status === 'AVAILABLE') {
      acc[branchId].available++;
    }
    return acc;
  }, {} as Record<string, { branchName: string; total: number; available: number }>);

  return (
    <div className="book-detail-page">
      <button className="btn-secondary back-btn" onClick={() => navigate('/catalog')}>
        <ArrowLeft size={16} />
        Back to Catalog
      </button>

      <div className="book-detail">
        <div className="book-cover-section">
          {book.coverImageUrl ? (
            <img src={book.coverImageUrl} alt={book.bookName} className="book-cover-img" />
          ) : (
            <div className="cover-placeholder-large">
              <BookOpen size={64} />
            </div>
          )}
        </div>

        <div className="book-info-section">
          <h1 className="book-title">{book.bookName}</h1>
          <p className="book-author">by {book.author}</p>

          {book.categoryName && (
            <span className="book-category-badge">{book.categoryName}</span>
          )}

          <div className="book-meta">
            {book.isbn && (
              <div className="meta-item">
                <span className="meta-label">ISBN:</span>
                <span>{book.isbn}</span>
              </div>
            )}
            {book.publication && (
              <div className="meta-item">
                <span className="meta-label">Publisher:</span>
                <span>{book.publication}</span>
              </div>
            )}
            {book.language && (
              <div className="meta-item">
                <span className="meta-label">Language:</span>
                <span>{book.language}</span>
              </div>
            )}
            {book.location && (
              <div className="meta-item">
                <MapPin size={14} />
                <span>{book.location}</span>
              </div>
            )}
          </div>

          {book.description && (
            <div className="book-description">
              <h3>Description</h3>
              <p>{book.description}</p>
            </div>
          )}

          <div className="availability-section">
            <h3>
              <Clock size={16} />
              Availability
            </h3>
            <div className="availability-summary">
              <span className={book.availableCopies > 0 ? 'available' : 'unavailable'}>
                {book.availableCopies} of {book.totalCopies} copies available
              </span>
            </div>

            {Object.keys(copiesByBranch).length > 0 && (
              <div className="branch-availability">
                {Object.entries(copiesByBranch).map(([branchId, info]) => (
                  <div key={branchId} className="branch-row">
                    <span className="branch-name">{info.branchName}</span>
                    <span className="branch-count">
                      {info.available} / {info.total} available
                    </span>
                  </div>
                ))}
              </div>
            )}

            {book.availableCopies === 0 && (
              <div className="reserve-section">
                <p className="reserve-note">No copies currently available. You can reserve this book to be notified when it becomes available.</p>
                <div className="reserve-form">
                  <select
                    value={selectedBranchId}
                    onChange={e => setSelectedBranchId(e.target.value)}
                  >
                    <option value="">Select a branch...</option>
                    {branches.map(branch => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                  <button
                    className="btn-reserve"
                    onClick={handleReserve}
                    disabled={reserveLoading || !selectedBranchId}
                  >
                    <Bookmark size={14} />
                    {reserveLoading ? 'Reserving...' : 'Reserve'}
                  </button>
                </div>
                {reserveSuccess && <p className="reserve-success">{reserveSuccess}</p>}
                {reserveError && <p className="reserve-error">{reserveError}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
