import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Sparkles, ScanLine, Camera, Radio } from 'lucide-react';

export function PhoneFrame({ children }: { children: ReactNode }) {
  return <div className="studio-shell">
    <header className="studio-nav"><Link href="/" className="wordmark" aria-label="Fit Check home"><span className="brand-icon"><ScanLine size={20} /></span>fitcheck<span className="brand-dot">®</span></Link>
      <span className="event-pill"><span /> BUILT FOR DEVFEST ’26</span>
      <a className="source-link" href="https://github.com/qwerty7030/Devfest-2026" target="_blank" rel="noreferrer">Behind the fit <ArrowUpRight size={15}/></a>
    </header>
    <main className="studio-main">
      <section className="studio-story">
        <div className="eyebrow"><span /> THE SPOTLIGHT IS YOURS</div>
        <h1>Your outfit.<br/>Main character<br/><span>energy.</span><Sparkles className="hero-spark" size={38}/></h1>
        <p className="hero-copy">A little runway. A little hype.<br/>A whole new way to see your style.</p>
        <div className="how-it-works"><div><span>01</span><Radio size={17}/><p>Go live<small>15 seconds. All you.</small></p></div>
          <div><span>02</span><Camera size={17}/><p>Strike a pose<small>Capture your best angles.</small></p></div>
          <div><span>03</span><Sparkles size={17}/><p>Meet your fit<small>AI styling, made personal.</small></p></div></div>
        <div className="editorial-note"><span>YOUR STYLE, YOUR RULES.</span><p>No trends to chase. Just a fresh perspective on what makes your outfit yours.</p></div>
      </section>
      <section className="camera-column" aria-label="Fit Check studio"><div className="studio-label"><span><i/> YOUR PERSONAL STYLE STUDIO</span><span>VOL. 001</span></div>
        <div className="camera-stage">{children}</div>
        <div className="studio-caption"><span>Camera stays in your control.</span><span>Made to be you. ↗</span></div>
      </section>
    </main>
    <footer className="studio-footer"><span>GOOD FITS DESERVE A MOMENT.</span><span>AI reactions · Simulated audience · No social posting</span></footer>
  </div>;
}
