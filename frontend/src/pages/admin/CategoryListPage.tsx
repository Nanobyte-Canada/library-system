import { useState, useEffect } from 'react';
import { Plus, Edit } from 'lucide-react';
import { categoryService } from '../../services/categoryService';
import type { Category, CategoryCreateRequest } from '../../types';
import './CategoryListPage.css';

export function CategoryListPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryCreateRequest>({
    name: '',
    parentId: null,
  });
  const [error, setError] = useState('');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const response = await categoryService.listCategories();
      if (response.success) {
        setCategories(response.data);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingCategory(null);
    setFormData({ name: '', parentId: null });
    setShowModal(true);
    setError('');
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({ name: category.name, parentId: category.parentId });
    setShowModal(true);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Category name is required');
      return;
    }

    try {
      await categoryService.createCategory(formData);
      setShowModal(false);
      loadCategories();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Operation failed');
    }
  };

  const rootCategories = categories.filter(c => !c.parentId);
  const childCategories = categories.filter(c => c.parentId);

  return (
    <div className="admin-categories-page">
      <div className="admin-page-header">
        <h1>Categories</h1>
        <button className="btn btn-primary" onClick={handleCreate}>
          <Plus size={16} />
          Add Category
        </button>
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="spinner" />
          <p>Loading categories...</p>
        </div>
      ) : rootCategories.length === 0 ? (
        <div className="empty-state">
          <p>No categories yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="category-grid">
          {rootCategories.map(category => {
            const children = childCategories.filter(c => c.parentId === category.id);
            return (
              <div key={category.id} className="category-card">
                <div className="category-card-name">{category.name}</div>
                {children.length > 0 && (
                  <div className="category-card-children">
                    {children.map(child => (
                      <div key={child.id} className="category-card-child">
                        <span>{child.name}</span>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleEdit(child)}>
                          <Edit size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="category-card-meta">
                  {children.length} subcategor{children.length === 1 ? 'y' : 'ies'}
                </div>
                <div className="category-card-actions">
                  <button className="btn btn-outline btn-sm" onClick={() => handleEdit(category)}>
                    <Edit size={14} />
                    Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="category-form-modal" onClick={() => setShowModal(false)}>
          <div className="category-form-content" onClick={e => e.stopPropagation()}>
            <h2>{editingCategory ? 'Edit Category' : 'New Category'}</h2>
            <form onSubmit={handleSubmit}>
              {error && <div className="category-form-error">{error}</div>}
              <div className="form-group">
                <label htmlFor="name">Name</label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Category name"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label htmlFor="parentId">Parent Category (optional)</label>
                <select
                  id="parentId"
                  value={formData.parentId || ''}
                  onChange={e => setFormData(prev => ({
                    ...prev,
                    parentId: e.target.value || null,
                  }))}
                >
                  <option value="">None (root category)</option>
                  {categories
                    .filter(c => c.id !== editingCategory?.id)
                    .map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>
              </div>
              <div className="category-form-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingCategory ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
