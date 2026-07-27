import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, Save, ArrowLeft } from 'lucide-react';
import { bookService } from '../../services/bookService';
import { categoryService } from '../../services/categoryService';
import type { BookCreateRequest, BookUpdateRequest, Category, IsbnLookupResponse } from '../../types';
import './BookFormPage.css';

export function BookFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState<BookCreateRequest>({
    isbn: '',
    bookName: '',
    author: '',
    publication: '',
    language: '',
    location: '',
    description: '',
    coverImageUrl: '',
    categoryId: null,
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [isbnLoading, setIsbnLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadCategories();
    if (isEdit && id) {
      loadBook(id);
    }
  }, [id, isEdit]);

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

  const loadBook = async (bookId: string) => {
    setLoading(true);
    try {
      const response = await bookService.getBook(bookId);
      if (response.success && response.data) {
        const book = response.data;
        setFormData({
          isbn: book.isbn,
          bookName: book.bookName,
          author: book.author,
          publication: book.publication,
          language: book.language,
          location: book.location,
          description: book.description,
          coverImageUrl: book.coverImageUrl,
          categoryId: book.categoryId,
        });
      }
    } catch (err) {
      setError('Failed to load book');
    } finally {
      setLoading(false);
    }
  };

  const handleIsbnLookup = async () => {
    if (!formData.isbn) return;

    setIsbnLoading(true);
    setError('');
    try {
      const response = await bookService.lookupIsbn(formData.isbn);
      if (response.success && response.data) {
        const isbnData: IsbnLookupResponse = response.data;
        setFormData(prev => ({
          ...prev,
          bookName: isbnData.title || prev.bookName,
          author: isbnData.author || prev.author,
          publication: isbnData.publication || prev.publication,
          language: isbnData.language || prev.language,
          coverImageUrl: isbnData.coverImageUrl || prev.coverImageUrl,
          description: isbnData.description || prev.description,
        }));
        setSuccess('Book details auto-filled from ISBN');
      } else {
        setError('ISBN not found in Open Library');
      }
    } catch (err) {
      setError('ISBN lookup failed');
    } finally {
      setIsbnLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.bookName || !formData.author) {
      setError('Title and author are required');
      return;
    }

    setLoading(true);
    try {
      if (isEdit && id) {
        const updateData: BookUpdateRequest = {
          ...formData,
          categoryId: formData.categoryId ?? undefined,
        };
        await bookService.updateBook(id, updateData);
        setSuccess('Book updated successfully');
      } else {
        await bookService.createBook(formData);
        setSuccess('Book created successfully');
        setTimeout(() => navigate('/admin/books'), 1000);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="book-form-page">
      <div className="page-header">
        <button className="btn-secondary" onClick={() => navigate('/admin/books')}>
          <ArrowLeft size={16} />
          Back to Books
        </button>
        <h1 className="page-title">{isEdit ? 'Edit Book' : 'Add New Book'}</h1>
      </div>

      {error && <div className="form-error">{error}</div>}
      {success && <div className="form-success">{success}</div>}

      <form onSubmit={handleSubmit} className="book-form">
        <div className="form-section">
          <h2>Book Information</h2>

          <div className="isbn-row">
            <div className="form-group flex-1">
              <label htmlFor="isbn">ISBN</label>
              <input
                type="text"
                id="isbn"
                name="isbn"
                value={formData.isbn}
                onChange={handleChange}
                placeholder="Enter ISBN"
              />
            </div>
            <button
              type="button"
              className="btn-secondary isbn-lookup-btn"
              onClick={handleIsbnLookup}
              disabled={isbnLoading || !formData.isbn}
            >
              <Search size={16} />
              {isbnLoading ? 'Looking up...' : 'Lookup ISBN'}
            </button>
          </div>

          <div className="form-group">
            <label htmlFor="bookName">Title *</label>
            <input
              type="text"
              id="bookName"
              name="bookName"
              value={formData.bookName}
              onChange={handleChange}
              required
              placeholder="Book title"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="author">Author *</label>
              <input
                type="text"
                id="author"
                name="author"
                value={formData.author}
                onChange={handleChange}
                required
                placeholder="Author name"
              />
            </div>
            <div className="form-group">
              <label htmlFor="publication">Publication</label>
              <input
                type="text"
                id="publication"
                name="publication"
                value={formData.publication}
                onChange={handleChange}
                placeholder="Publisher name"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="language">Language</label>
              <input
                type="text"
                id="language"
                name="language"
                value={formData.language}
                onChange={handleChange}
                placeholder="e.g., English"
              />
            </div>
            <div className="form-group">
              <label htmlFor="categoryId">Category</label>
              <select
                id="categoryId"
                name="categoryId"
                value={formData.categoryId || ''}
                onChange={handleChange}
              >
                <option value="">Select category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="location">Location</label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="e.g., Shelf A-12"
            />
          </div>

          <div className="form-group">
            <label htmlFor="coverImageUrl">Cover Image URL</label>
            <input
              type="url"
              id="coverImageUrl"
              name="coverImageUrl"
              value={formData.coverImageUrl}
              onChange={handleChange}
              placeholder="https://..."
            />
            {formData.coverImageUrl && (
              <img
                src={formData.coverImageUrl}
                alt="Cover preview"
                className="cover-preview"
              />
            )}
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              placeholder="Book description..."
            />
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => navigate('/admin/books')}
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={loading}>
            <Save size={16} />
            {loading ? 'Saving...' : isEdit ? 'Update Book' : 'Create Book'}
          </button>
        </div>
      </form>
    </div>
  );
}
