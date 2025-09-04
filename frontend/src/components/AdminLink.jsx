// frontend/src/components/AdminLink.jsx
export default function AdminLink() {
  const show = String(import.meta.env.VITE_SHOW_ADMIN_LINK) === "true";
  if (!show) return null;

  const apiBase = import.meta.env.VITE_API_BASE || "";
  const adminPath = import.meta.env.VITE_ADMIN_URL || "/admin/";
  let href = adminPath;
  try { href = new URL(adminPath, apiBase).toString(); } catch {}

  return (
    <a href={href} target="_blank" rel="noreferrer" style={{ marginLeft: 16 }}>
      Admin
    </a>
  );
}
