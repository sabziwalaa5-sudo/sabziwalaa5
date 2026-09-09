export function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function validateSlug(slug: string): string | null {
  const normalized = slugify(slug);
  if (!normalized) return "Slug is required";
  if (normalized.length < 2) return "Slug must be at least 2 characters";
  if (normalized.length > 80) return "Slug must be at most 80 characters";
  return null;
}

export function validateName(name: string, label = "Name"): string | null {
  const trimmed = name.trim();
  if (!trimmed) return `${label} is required`;
  if (trimmed.length > 120) return `${label} must be at most 120 characters`;
  return null;
}
