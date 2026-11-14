import { useEffect, useState } from 'react';
import { ArrowDownToLine, ArrowUpRight, Check, Copy, RotateCcw, Sparkles, X } from 'lucide-react';
import type { FitResult } from '../../types/fitCheck';
import { soundEffects } from '../../services/soundEffects';

export function StyleResults({ result, onReset, onRetake }: { result: FitResult; onReset: () => void; onRetake: () => void }) {
  const [photo, setPhoto] = useState(0);
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState('');
  const [caption, setCaption] = useState(result.caption);
  useEffect(() => { soundEffects.playResultFanfare(); }, []);
  const download = () => {
    const link = document.createElement('a');
    link.href = result.capturedPhotos[photo]; link.download = `fitcheck-${photo + 1}.jpg`; link.click();
    setNotice('Your photo is ready to save.');
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(caption); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { setNotice('Select the caption below to copy it manually.'); }
  };
  const share = async () => {
    if (!navigator.share) { await copy(); return; }
    try { await navigator.share({ title: 'My Fit Check', text: caption }); }
    catch (e) { if (!(e instanceof Error && e.name === 'AbortError')) setNotice('Sharing is unavailable. Save your photo and copy the caption instead.'); }
  };
  return <div className="style-results">
    <header className="results-nav"><span><Sparkles size={15}/>{result.source === 'demo' ? 'DEMO STYLE REPORT' : 'YOUR STYLE REPORT'}</span><button onClick={onReset} aria-label="Close style report"><X size={20}/></button></header>
    <div className="results-scroll">
      <div className="result-image"><img src={result.capturedPhotos[photo]} alt={`Your outfit, pose ${photo + 1}`}/><div className="score-stamp"><strong>{result.overallScore}<small>/100</small></strong><span>STYLE SCORE</span></div>
        <span className="photo-note">{result.source === 'demo' ? 'SAMPLE OUTFIT · SAMPLE SCORE' : 'YOUR FIT. YOUR MOMENT.'}</span>
        {result.capturedPhotos.length > 1 && <div className="photo-tabs">{result.capturedPhotos.map((_, i) => <button key={i} aria-label={`View pose ${i+1}`} aria-pressed={i === photo} onClick={() => setPhoto(i)}>{String(i+1).padStart(2,'0')}</button>)}</div>}
      </div>
      <section className="result-intro"><span className="eyebrow">THE VERDICT IS IN</span><h2>{result.archetype}</h2><p>{result.summary}</p><span className="result-disclosure">{result.source === 'demo' ? 'This is a sample review. Enable your camera for a personal analysis.' : 'An AI perspective on your styling, never a rating of you.'}</span></section>
      <section className="result-section"><div className="section-label"><h3>The details make it.</h3><span>{result.garments.length} PIECES</span></div>
        {result.garments.map((g, i) => <div className="garment-row" key={`${g.category}-${i}`}><span className="garment-number">{String(i+1).padStart(2,'0')}</span><div><span className="garment-category">{g.category}</span><h4>{g.description}</h4><p>{g.color}{g.highlight ? ` · ${g.highlight}` : ''}</p></div></div>)}
      </section>
      <section className="result-section"><div className="section-label"><h3>A little crowd love.</h3><span>AI REACTIONS</span></div><div className="crowd-quotes">{result.topComments.map(c => <blockquote key={c.id}><p>“{c.comment}”</p><cite>@{c.username}</cite></blockquote>)}</div></section>
      <section className="result-section caption-section"><div className="section-label"><h3>Make it a post.</h3><button onClick={copy}>{copied ? <Check size={15}/> : <Copy size={15}/>} {copied ? 'Copied' : 'Copy'}</button></div><label className="sr-only" htmlFor="caption">Edit your post caption</label><textarea id="caption" value={caption} onChange={e => setCaption(e.target.value)} rows={5} maxLength={1200}/><p>Yours to edit. Nothing is posted automatically.</p></section>
      <div className="result-secondary"><button onClick={onRetake}><RotateCcw size={14}/>Retake photos</button><button onClick={share}>Share caption <ArrowUpRight size={14}/></button></div>
      <p className="result-notice" role="status">{notice}</p>
    </div>
    <footer className="results-actions"><button onClick={download}><ArrowDownToLine size={17}/>Save photo</button><button className="primary-action" onClick={onReset}>Check another fit <ArrowUpRight size={17}/></button></footer>
  </div>;
}
