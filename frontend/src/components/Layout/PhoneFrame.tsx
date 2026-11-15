import type { ReactNode } from 'react';
import Link from 'next/link';
export function PhoneFrame({ children }: { children: ReactNode }) {
  return <div className="studio-shell"><header className="studio-nav"><Link className="wordmark" href="/">fit check<span>®</span></Link><Link href="/feed">My looks ↗</Link></header><main className="studio-main"><div className="camera-column"><div className="camera-stage">{children}</div></div></main></div>;
}
