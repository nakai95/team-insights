/**
 * Public Layout
 *
 * Purpose: Minimal layout wrapper for public pages
 *
 * Pages in this group:
 * - Landing page (/)
 * - Login page (/login)
 *
 * Why minimal?
 * - Landing and login pages have completely different layouts
 * - Each page handles its own layout inline
 * - No shared header/footer structure
 */

interface PublicLayoutProps {
  children: React.ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  return <>{children}</>;
}
