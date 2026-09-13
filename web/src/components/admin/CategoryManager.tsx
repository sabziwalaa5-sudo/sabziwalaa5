"use client";

import { useEffect, useState } from "react";
import { Plus, ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import {
  fetchCategories,
  saveCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  type ClientCategory,
} from "../../lib/storeApi";

export default function CategoryManager() {
  const [categories, setCategories] = useState<ClientCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", slug: "", description: "", icon: "", imageUrl: "" });
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setCategories(await fetchCategories(false));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setForm({ name: "", slug: "", description: "", icon: "", imageUrl: "" });
    setEditingId(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      if (editingId) {
        await updateCategory(editingId, {
          name: form.name,
          slug: form.slug || undefined,
          description: form.description || null,
          icon: form.icon || null,
          imageUrl: form.imageUrl || null,
        });
        setMessage("Category updated.");
      } else {
        await saveCategory({
          name: form.name,
          slug: form.slug || undefined,
          description: form.description || undefined,
          icon: form.icon || undefined,
          imageUrl: form.imageUrl || undefined,
        });
        setMessage("Category created.");
      }
      resetForm();
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to save category");
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    const next = [...categories];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setCategories(next);
    await reorderCategories(next.map((c) => c.id));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0 }}>Product Categories</h3>
      </div>

      {message && <p style={{ fontSize: 13, color: "var(--accent)" }}>{message}</p>}

      <form onSubmit={handleSave} className="card" style={{ padding: 16, borderRadius: 16, display: "grid", gap: 12 }}>
        <strong>{editingId ? "Edit Category" : "Add Category"}</strong>
        <input placeholder="Name (e.g. Organic Products)" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        <input placeholder="Slug (optional)" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
        <input placeholder="Description (optional)" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <input placeholder="Icon emoji (optional)" value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))} />
          <input placeholder="Image URL (optional)" value={form.imageUrl} onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" className="btn btn-primary">{editingId ? "Save Changes" : "Add Category"}</button>
          {editingId && <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancel</button>}
        </div>
      </form>

      <div className="card" style={{ padding: 0, borderRadius: 16, overflow: "hidden" }}>
        {loading ? (
          <p style={{ padding: 16 }}>Loading categories…</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-secondary)", fontSize: "0.85rem" }}>
                <th style={{ padding: "1rem", textAlign: "left" }}>Order</th>
                <th style={{ padding: "1rem", textAlign: "left" }}>Category</th>
                <th style={{ padding: "1rem", textAlign: "left" }}>Slug</th>
                <th style={{ padding: "1rem", textAlign: "left" }}>Products</th>
                <th style={{ padding: "1rem", textAlign: "left" }}>Status</th>
                <th style={{ padding: "1rem", textAlign: "left" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat, index) => (
                <tr key={cat.id} style={{ borderTop: "1px solid var(--border)", fontSize: "0.85rem" }}>
                  <td style={{ padding: "1rem" }}>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button type="button" className="btn btn-secondary" style={{ padding: 4 }} onClick={() => move(index, -1)}><ArrowUp size={14} /></button>
                      <button type="button" className="btn btn-secondary" style={{ padding: 4 }} onClick={() => move(index, 1)}><ArrowDown size={14} /></button>
                    </div>
                  </td>
                  <td style={{ padding: "1rem" }}>{cat.icon ? `${cat.icon} ` : ""}{cat.name}</td>
                  <td style={{ padding: "1rem" }}>{cat.slug}</td>
                  <td style={{ padding: "1rem" }}>{cat.productCount ?? 0}</td>
                  <td style={{ padding: "1rem" }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ fontSize: "0.75rem" }}
                      onClick={async () => {
                        await updateCategory(cat.id, { isActive: !cat.isActive });
                        await load();
                      }}
                    >
                      {cat.isActive ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td style={{ padding: "1rem" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ fontSize: "0.75rem" }}
                        onClick={() => {
                          setEditingId(cat.id);
                          setForm({
                            name: cat.name,
                            slug: cat.slug,
                            description: cat.description || "",
                            icon: cat.icon || "",
                            imageUrl: cat.imageUrl || "",
                          });
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ fontSize: "0.75rem", color: "var(--danger)", borderColor: "var(--danger)" }}
                        onClick={async () => {
                          if (!confirm(`Delete category "${cat.name}"?`)) return;
                          try {
                            await deleteCategory(cat.id);
                            await load();
                          } catch (err) {
                            setMessage(err instanceof Error ? err.message : "Delete failed");
                          }
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
