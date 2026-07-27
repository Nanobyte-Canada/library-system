import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { BookListPage } from './pages/admin/BookListPage';
import { BookFormPage } from './pages/admin/BookFormPage';
import { CategoryListPage } from './pages/admin/CategoryListPage';
import { UserListPage } from './pages/admin/UserListPage';
import { UserFormPage } from './pages/admin/UserFormPage';
import { CatalogPage } from './pages/member/CatalogPage';
import { BookDetailPage } from './pages/member/BookDetailPage';
import { ProfilePage } from './pages/member/ProfilePage';
import '@/App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Admin/Librarian routes */}
          <Route element={<ProtectedRoute roles={['ADMIN', 'LIBRARIAN']}><Layout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/admin/books" element={<BookListPage />} />
            <Route path="/admin/books/new" element={<BookFormPage />} />
            <Route path="/admin/books/:id" element={<BookFormPage />} />
            <Route path="/admin/categories" element={<CategoryListPage />} />
            <Route path="/admin/users" element={<UserListPage />} />
            <Route path="/admin/users/new" element={<UserFormPage />} />
            <Route path="/admin/users/:id" element={<UserFormPage />} />
          </Route>

          {/* Member routes (also accessible to Admin/Librarian) */}
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/catalog" element={<CatalogPage />} />
            <Route path="/catalog/:id" element={<BookDetailPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
