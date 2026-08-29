import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, CellClickedEvent } from 'ag-grid-community';
import { AllCommunityModule } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { Plus } from 'lucide-react';
import { bookService } from '../../services/bookService';
import type { Book } from '../../types';
import './BookListPage.css';

export function BookListPage() {
  const navigate = useNavigate();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);

  const columnDefs: ColDef<Book>[] = useMemo(() => [
    { headerName: 'Title', field: 'bookName', sortable: true, filter: true, flex: 2 },
    { headerName: 'Author', field: 'author', sortable: true, filter: true, flex: 1 },
    { headerName: 'ISBN', field: 'isbn', sortable: true, filter: true, flex: 1 },
    { headerName: 'Category', field: 'categoryName', sortable: true, filter: true, flex: 1 },
    { headerName: 'Language', field: 'language', sortable: true, filter: true, flex: 1 },
    {
      headerName: 'Available',
      field: 'availableCopies',
      sortable: true,
      flex: 1,
      valueFormatter: (params) => {
        const book = params.data;
        return book ? `${book.availableCopies} / ${book.totalCopies}` : '';
      },
    },
  ], []);

  const onCellClicked = useCallback((event: CellClickedEvent<Book>) => {
    if (event.data) {
      navigate(`/admin/books/${event.data.id}`);
    }
  }, [navigate]);

  useEffect(() => {
    loadBooks();
  }, [currentPage]);

  const loadBooks = async () => {
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
  };

  return (
    <div className="book-list-page">
      <div className="page-header">
        <h1 className="page-title">Books</h1>
        <button
          className="btn-primary"
          onClick={() => navigate('/admin/books/new')}
        >
          <Plus size={16} />
          Add Book
        </button>
      </div>

      <div className="ag-theme-alpine" style={{ height: '600px', width: '100%' }}>
        <AgGridReact
          rowData={books}
          columnDefs={columnDefs}
          modules={[AllCommunityModule]}
          pagination={true}
          paginationPageSize={20}
          onCellClicked={onCellClicked}
          loading={loading}
          overlayNoRowsTemplate="No books found"
        />
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn-secondary"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => prev - 1)}
          >
            Previous
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            className="btn-secondary"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => prev + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
