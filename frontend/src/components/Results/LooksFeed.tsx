'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowDownToLine, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { currentLooks, deleteLook, feedNotice, loadLooks, type FitPost } from '../../services/fitFeed';
import '../../studio.css';

function LookCard({ post, onDelete }: { post: FitPost; onDelete: () => void }) {
  const [photo, setPhoto] = useState(0), [expanded, setExpanded] = useState(false);
  const download = () => { const link = document.createElement('a'); link.href = post.capturedPhotos[photo]; link.download = `drip-score-${post.id}-${photo + 1}.jpg`; link.click(); };
  return <article className="look-card">
    <header><div><strong>{post.archetype}</strong><small>{post.source === 'demo' ? 'Demo · ' : ''}{new Date(post.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</small></div><button className="icon-button" onClick={onDelete} aria-label="Delete this look"><Trash2 size={16}/></button></header>
    {post.capturedPhotos.length ? <><div className="look-photo"><img src={post.capturedPhotos[photo]} alt={`Outfit photo ${photo + 1} of ${post.capturedPhotos.length}`}/><span className="photo-counter">{photo + 1} / {post.capturedPhotos.length}</span>
      {post.capturedPhotos.length > 1 && <><button className="photo-prev icon-button" aria-label="Previous photo" onClick={() => setPhoto(i => (i - 1 + post.capturedPhotos.length) % post.capturedPhotos.length)}><ChevronLeft size={20}/></button><button className="photo-next icon-button" aria-label="Next photo" onClick={() => setPhoto(i => (i + 1) % post.capturedPhotos.length)}><ChevronRight size={20}/></button></>}
    </div>
    <div className="look-thumbnails">{post.capturedPhotos.map((src, i) => <button key={i} aria-label={`Show photo ${i + 1}`} aria-pressed={i === photo} onClick={() => setPhoto(i)}><img src={src} alt=""/></button>)}<button className="icon-button save-look-photo" onClick={download} aria-label="Save selected photo"><ArrowDownToLine size={18}/></button></div></> : <p className="score-only-note">Score saved in Firestore. Photos are only on the browser that captured this look.</p>}
    <div className="look-body"><div className="score-line"><div><small>Final score</small><strong>{post.overallScore}<span>/100</span></strong></div><div><small>AI</small><b>{post.aiScore ?? post.overallScore}</b></div><span>+</span><div><small>Rules</small><b>{post.rulesScore ?? '—'}</b></div><span>÷ 2</span></div>
      {!!post.streamComments?.length && <section className="saved-comments" aria-label="Comments from your live session"><h2>From your live</h2>{post.streamComments.map((c, i) => <blockquote key={i}><small>{c.feedbackType === 'suggestion' ? 'Try this' : 'Works well'}</small><p>{c.text}</p>{c.suggestion && <p className="saved-suggestion">{c.suggestion}</p>}</blockquote>)}</section>}
      <p>{post.summary}</p><p className="look-caption">{post.caption}</p>
      <button className="text-button" aria-expanded={expanded} onClick={() => setExpanded(v => !v)}>{expanded ? 'Hide breakdown −' : 'Score breakdown +'}</button>
      {expanded && <div className="score-details">{post.rules ? <>
        <p>Final = (AI {post.aiScore} + rules {post.rulesScore}) ÷ 2. Both use a 100-point scale.</p>
        {[['Fit & drape', post.rules.fitScore], ['7–8 point method', post.rules.pointsScore], ['Visual hierarchy', post.rules.hierarchyScore], ['Color & weight continuity', post.rules.continuityScore]].map(([label, value]) => <div className="score-detail" key={label}><span>{label}</span><b>{Math.round(Number(value) * 1000) / 10}/100</b></div>)}
        <p>{post.rules.totalPoints} styling points · Fit gate ×{post.rules.fitGateMultiplier}</p>
        <ul>{post.rules.notes.map(note => <li key={note}>{note}</li>)}</ul>
        <p>Rules are computed from AI-estimated garment features. Partial views score only visible pieces.</p>
        {post.scoringGarments?.map((g, i) => <p key={i}><strong>{g.name}</strong><br/>Fit {g.fitQuality} · Drape {g.drapeHarmony} · {g.points} pt · {g.hierarchy} · {g.colorFamily} · {g.visualWeight}</p>)}
      </> : <p>Sample review. Start a camera session for both scores.</p>}
      {post.topComments.map(c => <blockquote key={c.id}>{c.comment}</blockquote>)}</div>}
    </div>
  </article>;
}
export function LooksFeed({ latest, onCamera, saveNotice }: { latest?: FitPost; onCamera?: () => void; saveNotice?: string }) {
  const [posts, setPosts] = useState<FitPost[]>(latest ? [latest] : []);
  const [notice, setNotice] = useState(saveNotice ?? ''), [loading, setLoading] = useState(true);
  useEffect(() => { if (saveNotice) setNotice(saveNotice); }, [saveNotice]);
  useEffect(() => { let active = true;
    loadLooks().then(items => { if (active) { setPosts(items.length ? items : latest ? [latest] : []); setNotice(feedNotice()); } })
      .catch(() => { if (active) { setPosts(latest ? [latest, ...currentLooks().filter(p => p.id !== latest.id)] : currentLooks()); setNotice('Browser storage is unavailable. This look is available for this visit.'); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [latest]);
  const remove = async (id: string) => { try { await deleteLook(id); setPosts(p => p.filter(x => x.id !== id)); } catch { setNotice('Could not delete this look. Please try again.'); } };
  return <div className="feed-shell"><header className="studio-nav"><Link className="wordmark" href="/">drip score<span>®</span></Link>{onCamera ? <button className="text-button" onClick={onCamera}>New look ↗</button> : <Link href="/">New look ↗</Link>}</header><main className="looks-feed"><div className="feed-heading"><h1>My looks</h1><p>Scores in Firestore · photos on this browser.</p></div>{notice && <p role="status">{notice}</p>}{loading && !posts.length ? <p>Loading looks…</p> : !posts.length ? <div className="empty-feed"><p>Your next look starts here.</p><Link className="primary-action" href="/">Open camera</Link></div> : posts.map(post => <LookCard key={post.id} post={post} onDelete={() => void remove(post.id)}/>)}</main></div>;
}
