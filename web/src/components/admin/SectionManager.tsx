"use client";

import { useEffect, useState } from "react";
import { ArrowUp, ArrowDown, Trash2 } from "lucide-react";
import type { ClientProduct } from "../../lib/server/repository";
import {
  fetchCategories,
  fetchSections,
  saveSection,
  updateSection,
  deleteSection,
  reorderSections,
  assignProductToSection,
  removeProductFromSection,
  type ClientSection,
} from "../../lib/storeApi";

const SECTION_TYPES = ["CATEGORY", "MANUAL", "BEST_SELLERS", "NEW_ARRIVALS", "FEATURED", "DEALS"] as const;

type Props = {
  products: ClientProduct[];
};

export default function SectionManager({ products }: Props) {
  const [sections, setSections] = useState<ClientSection[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    sectionType: "MANUAL",
    categoryId: "",
    maxProducts: 8,
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [assignSectionId, setAssignSectionId] = useState<string | null>(null);
  const [assignProductId, setAssignProductId] = useState("");

  const load = async () => {
    const [sectionRows, categoryRows] = await Promise.all([
      fetchSections(false, true),
      fetchCategories(false),
    ]);
    setSections(sectionRows);
    setCategories(categoryRows.map((c) => ({ id: c.id, name: c.name })));
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setForm({ name: "", slug: "", sectionType: "MANUAL", categoryId: "", maxProducts: 8 });
    setEditingId(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    try {
      const payload = {
        name: form.name,
        slug: form.slug || undefined,
        sectionType: form.sectionType,
        categoryId: form.sectionType === "CATEGORY" ? form.categoryId : undefined,
        maxProducts: form.maxProducts,
      };
      if (editingId) {
        await updateSection(editingId, payload);
        setMessage("Section updated.");
      } else {
        await saveSection(payload);
        setMessage("Section created.");
      }
      resetForm();
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to save section");
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    const next = [...sections];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setSections(next);
    await reorderSections(next.map((s) => s.id));
  };

  const manualSection = (section: ClientSection) => ["MANUAL", "FEATURED", "DEALS"].includes(section.sectionType);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <h3 style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0 }}>Storefront Sections</h3>
      {message && <p style={{ fontSize: 13, color: "var(--accent)" }}>{message}</p>}

      <form onSubmit={handleSave} className="card" style={{ padding: 16, borderRadius: 16, display: "grid", gap: 12 }}>
        <strong>{editingId ? "Edit Section" : "Add Section"}</strong>
        <input placeholder="Section name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        <input placeholder="Slug (optional)" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} />
        <select value={form.sectionType} onChange={(e) => setForm((f) => ({ ...f, sectionType: e.target.value }))}>
          {SECTION_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
        {form.sectionType === "CATEGORY" && (
          <select required value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}>
            <option value="">Select category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        <input type="number" min={1} max={48} value={form.maxProducts} onChange={(e) => setForm((f) => ({ ...f, maxProducts: Number(e.target.value) || 8 }))} />
        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" className="btn btn-primary">{editingId ? "Save Changes" : "Add Section"}</button>
          {editingId && <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancel</button>}
        </div>
      </form>

      <div className="card" style={{ padding: 0, borderRadius: 16, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--bg-secondary)", fontSize: "0.85rem" }}>
              <th style={{ padding: "1rem" }}>Order</th>
              <th style={{ padding: "1rem" }}>Section</th>
              <th style={{ padding: "1rem" }}>Type</th>
              <th style={{ padding: "1rem" }}>Max</th>
              <th style={{ padding: "1rem" }}>Status</th>
              <th style={{ padding: "1rem" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sections.map((section, index) => (
              <tr key={section.id} style={{ borderTop: "1px solid var(--border)", fontSize: "0.85rem" }}>
                <td style={{ padding: "1rem" }}>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button type="button" className="btn btn-secondary" style={{ padding: 4 }} onClick={() => move(index, -1)}><ArrowUp size={14} /></button>
                    <button type="button" className="btn btn-secondary" style={{ padding: 4 }} onClick={() => move(index, 1)}><ArrowDown size={14} /></button>
                  </div>
                </td>
                <td style={{ padding: "1rem" }}>{section.name}</td>
                <td style={{ padding: "1rem" }}>{section.sectionType}</td>
                <td style={{ padding: "1rem" }}>{section.maxProducts}</td>
                <td style={{ padding: "1rem" }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: "0.75rem" }}
                    onClick={async () => {
                      await updateSection(section.id, { isActive: !section.isActive });
                      await load();
                    }}
                  >
                    {section.isActive ? "Active" : "Inactive"}
                  </button>
                </td>
                <td style={{ padding: "1rem" }}>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button type="button" className="btn btn-secondary" style={{ fontSize: "0.75rem" }} onClick={() => {
                      setEditingId(section.id);
                      setForm({
                        name: section.name,
                        slug: section.slug,
                        sectionType: section.sectionType,
                        categoryId: section.categoryId || "",
                        maxProducts: section.maxProducts,
                      });
                    }}>Edit</button>
                    {manualSection(section) && (
                      <button type="button" className="btn btn-secondary" style={{ fontSize: "0.75rem" }} onClick={() => setAssignSectionId(section.id)}>Assign Products</button>
                    )}
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ fontSize: "0.75rem", color: "var(--danger)", borderColor: "var(--danger)" }}
                      onClick={async () => {
                        if (!confirm(`Delete section "${section.name}"?`)) return;
                        await deleteSection(section.id);
                        await load();
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                  {manualSection(section) && section.productIds?.length ? (
                    <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "6px 0 0" }}>
                      {section.productIds.length} assigned product(s)
                    </p>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {assignSectionId && (
        <div className="card" style={{ padding: 16, borderRadius: 16 }}>
          <h4 style={{ marginTop: 0 }}>Assign product to section</h4>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select value={assignProductId} onChange={(e) => setAssignProductId(e.target.value)}>
              <option value="">Select product</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button
              type="button"
              className="btn btn-primary"
              onClick={async () => {
                if (!assignProductId) return;
                await assignProductToSection(assignSectionId, assignProductId);
                setAssignProductId("");
                await load();
                setMessage("Product assigned.");
              }}
            >
              Add
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setAssignSectionId(null)}>Close</button>
          </div>
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            {(sections.find((s) => s.id === assignSectionId)?.productIds || []).map((productId) => {
              const product = products.find((p) => p.id === productId);
              return (
                <div key={productId} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span>{product?.name || productId}</span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: "0.7rem" }}
                    onClick={async () => {
                      await removeProductFromSection(assignSectionId, productId);
                      await load();
                    }}
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
