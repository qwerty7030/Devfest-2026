import type { ReactNode } from 'react';

/**
 * Mobile-only layout: one phone-width column (max ~470px) centred on the paper
 * background. The camera stage fills the column's full height. Navigation lives
 * inside each stage's own overlay (see the READY screen), not in a page header.
 */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return <div className="studio-shell"><main className="camera-column">{children}</main></div>;
}
