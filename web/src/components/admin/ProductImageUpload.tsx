"use client";

import { useRef, useState } from "react";
import { Upload, X } from "lucide-react";
import { uploadProductImage, deleteProductImage } from "../../lib/storeApi";

type Props = {
  productId?: string | null;
  imageUrl?: string | null;
  onUploaded: (imageUrl: string) => void;
  onRemoved: () => void;
};

export default function ProductImageUpload({ productId, imageUrl, onUploaded, onRemoved }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(imageUrl || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    if (!productId) {
      setError("Save the product first, then upload an image.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const localPreview = URL.createObjectURL(file);
      setPreview(localPreview);
      const result = await uploadProductImage(productId, file);
      setPreview(result.imageUrl);
      onUploaded(result.imageUrl);
    } catch (err) {
      setPreview(imageUrl || null);
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!productId) {
      setPreview(null);
      onRemoved();
      return;
    }
    setUploading(true);
    setError(null);
    try {
      await deleteProductImage(productId);
      setPreview(null);
      onRemoved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove image");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label style={{ fontSize: "0.8rem", fontWeight: 600 }}>Product Image</label>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFile(e.dataTransfer.files?.[0] || null);
        }}
        style={{
          border: "2px dashed var(--border)",
          borderRadius: 12,
          padding: 16,
          textAlign: "center",
          background: "var(--bg-secondary)",
        }}
      >
        {preview ? (
          <div style={{ position: "relative", display: "inline-block" }}>
            <img src={preview} alt="Product preview" style={{ maxWidth: 180, maxHeight: 180, borderRadius: 12, objectFit: "cover" }} />
            <button
              type="button"
              onClick={handleRemove}
              disabled={uploading}
              style={{ position: "absolute", top: 6, right: 6, border: "none", borderRadius: "50%", width: 28, height: 28, background: "white", cursor: "pointer" }}
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
            <Upload size={24} style={{ marginBottom: 8 }} />
            <p style={{ margin: 0 }}>Drag & drop JPG, PNG, or WebP (max 5 MB)</p>
          </div>
        )}
        <button
          type="button"
          className="btn btn-secondary"
          style={{ marginTop: 12, fontSize: "0.8rem" }}
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? "Uploading…" : preview ? "Replace Image" : "Upload Product Image"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: "none" }}
          onChange={(e) => handleFile(e.target.files?.[0] || null)}
        />
      </div>
      {!productId && <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>Image upload unlocks after the product is created.</p>}
      {error && <p style={{ fontSize: 12, color: "var(--danger)", margin: 0 }}>{error}</p>}
    </div>
  );
}
