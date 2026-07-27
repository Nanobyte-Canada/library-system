import api from './api';
import type {
  Book,
  BookCreateRequest,
  BookUpdateRequest,
  BookSearchParams,
  BookCopyRequest,
  BookCopyResponse,
  BookTransferRequest,
  IsbnLookupResponse,
  ApiResponse,
  PaginatedResponse,
} from '../types';

export const bookService = {
  // Book CRUD
  async createBook(data: BookCreateRequest): Promise<ApiResponse<null>> {
    const response = await api.post<ApiResponse<null>>('/books', data);
    return response.data;
  },

  async updateBook(id: string, data: BookUpdateRequest): Promise<ApiResponse<null>> {
    const response = await api.put<ApiResponse<null>>(`/books/${id}`, data);
    return response.data;
  },

  async getBook(id: string): Promise<ApiResponse<Book>> {
    const response = await api.get<ApiResponse<Book>>(`/books/${id}`);
    return response.data;
  },

  async listBooks(page = 1, size = 20): Promise<PaginatedResponse<Book>> {
    const response = await api.get<PaginatedResponse<Book>>('/books', {
      params: { page, size },
    });
    return response.data;
  },

  async searchBooks(params: BookSearchParams): Promise<PaginatedResponse<Book>> {
    const response = await api.get<PaginatedResponse<Book>>('/books/search', {
      params,
    });
    return response.data;
  },

  // ISBN Lookup
  async lookupIsbn(isbn: string): Promise<ApiResponse<IsbnLookupResponse>> {
    const response = await api.get<ApiResponse<IsbnLookupResponse>>(`/books/isbn/${isbn}`);
    return response.data;
  },

  // Copy Management
  async addCopies(bookId: string, data: BookCopyRequest): Promise<ApiResponse<null>> {
    const response = await api.post<ApiResponse<null>>(`/books/${bookId}/copies`, data);
    return response.data;
  },

  async getCopies(bookId: string): Promise<ApiResponse<BookCopyResponse[]>> {
    const response = await api.get<ApiResponse<BookCopyResponse[]>>(`/books/${bookId}/copies`);
    return response.data;
  },

  async transferCopy(bookId: string, data: BookTransferRequest): Promise<ApiResponse<null>> {
    const response = await api.post<ApiResponse<null>>(`/books/${bookId}/transfer`, data);
    return response.data;
  },

  // QR Code
  async getQrCode(bookId: string): Promise<string> {
    const response = await api.get(`/books/${bookId}/qr`, {
      responseType: 'blob',
    });
    return URL.createObjectURL(response.data);
  },
};
