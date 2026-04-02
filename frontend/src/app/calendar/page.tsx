'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function GlobalCalendar() {
    const [posts, setPosts] = useState<any[]>([]);
    const [brands, setBrands] = useState<any[]>([]);
    const [brandFilter, setBrandFilter] = useState<string>('ALL');
    const [viewDate, setViewDate] = useState(new Date());
    const [loading, setLoading] = useState(true);
    
    const [selectedPost, setSelectedPost] = useState<any>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const resBrands = await fetch('http://localhost:8000/api/brands/');
            setBrands(await resBrands.json());
            
            const resPosts = await fetch('http://localhost:8000/api/ai/posts_global');
            setPosts(await resPosts.json());
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    // Calendar Math
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth(); // 0 index
    const firstDay = new Date(year, month, 1).getDay(); // 0(Sun) - 6(Sat)
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Shift so week starts on Monday instead of Sunday (Optional, standard is Sun for basic JS logic, we'll keep standard Sunday=0)
    const blanks = Array(firstDay).fill(null);
    const daySlots = Array.from({length: daysInMonth}, (_, i) => i + 1);
    const totalSlots = [...blanks, ...daySlots];

    const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
    const nextMonth = () => setViewDate(new Date(year, month + 1, 1));
    const today = new Date();

    const filteredPosts = posts.filter(p => brandFilter === 'ALL' || p.brand_id.toString() === brandFilter);

    const getPostsForDay = (day: number) => {
        return filteredPosts.filter(p => {
            if (!p.scheduled_for) return false;
            const d = new Date(p.scheduled_for);
            return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
        });
    };

    const getPlatformIcon = (plat: string) => {
        if (plat.toLowerCase() === 'facebook') return '📘';
        if (plat.toLowerCase() === 'instagram') return '📸';
        if (plat.toLowerCase() === 'tiktok') return '🎵';
        return '📰';
    };

    return (
        <main style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto', fontFamily: 'var(--font-inter)' }}>
            {/* Header Global */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <Link href="/" style={{ color: '#a1a1aa', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>← Volver al Dashboard</Link>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 600 }}>Filtrar Marcas:</span>
                    <select 
                        value={brandFilter} 
                        onChange={e => setBrandFilter(e.target.value)}
                        style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', outline: 'none', cursor: 'pointer', fontFamily: 'var(--font-inter)', fontWeight: 600 }}
                    >
                        <option value="ALL" style={{color: '#000'}}>Todas las Marcas (Torre de Control)</option>
                        {brands.map(b => (
                            <option key={b.id} value={b.id} style={{color: '#000'}}>{b.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h1 className="hero-title" style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Orquesta Global Multi-Marca</h1>
                <p style={{ color: '#94a3b8' }}>Visualiza y supervisa las parrillas de contenido de todos tus clientes a la vez.</p>
            </div>

            {/* Calendar Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(24, 24, 27, 0.8)', padding: '1rem 2rem', borderRadius: '16px 16px 0 0', border: '1px solid rgba(255,255,255,0.1)', borderBottom: 'none' }}>
                <div style={{display: 'flex', gap: '10px'}}>
                     <button onClick={prevMonth} style={navBtnStyle}>‹</button>
                     <button onClick={() => setViewDate(new Date())} style={{...navBtnStyle, fontSize: '0.9rem', padding: '0 16px', fontWeight: 600}}>HOY</button>
                     <button onClick={nextMonth} style={navBtnStyle}>›</button>
                </div>
                <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#f8fafc', fontWeight: 700, textTransform: 'capitalize' }}>
                     {new Intl.DateTimeFormat('es-CR', { timeZone: 'America/Costa_Rica', month: 'long', year: 'numeric' }).format(viewDate)}
                </h2>
                <div style={{width: '90px'}}></div> {/* Placeholder for centering balance */}
            </div>

            {/* Calendar Grid Box */}
            <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: '0 0 16px 16px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                {/* Weekdays Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    {['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map(d => (
                        <div key={d} style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>{d}</div>
                    ))}
                </div>
                
                {/* Days Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: 'minmax(140px, auto)' }}>
                    {totalSlots.map((day, idx) => {
                        const isToday = day && year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
                        const dayPosts = day ? getPostsForDay(day) : [];
                        
                        return (
                            <div key={idx} style={{ 
                                padding: '0.5rem', 
                                borderRight: '1px solid rgba(255,255,255,0.05)', 
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                background: isToday ? 'rgba(99, 102, 241, 0.05)' : 'transparent',
                                minHeight: '140px'
                            }}>
                                {day && (
                                    <>
                                        <div style={{ textAlign: 'right', marginBottom: '0.5rem' }}>
                                            <span style={{ 
                                                display: 'inline-block', width: '28px', height: '28px', lineHeight: '28px', textAlign: 'center', borderRadius: '50%',
                                                background: isToday ? '#6366f1' : 'transparent', 
                                                color: isToday ? '#fff' : '#64748b', 
                                                fontWeight: isToday ? 700 : 500, fontSize: '0.9rem' 
                                            }}>
                                                {day}
                                            </span>
                                        </div>
                                        
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            {dayPosts.map((p, pIdx) => {
                                                const bColor = p.brand_colors && p.brand_colors.length > 0 ? p.brand_colors[0] : '#6366f1';
                                                
                                                return (
                                                    <div key={p.id} onClick={() => setSelectedPost(p)} style={{
                                                        background: 'rgba(255,255,255,0.03)',
                                                        border: `1px solid rgba(255,255,255,0.08)`,
                                                        borderLeft: `4px solid ${bColor}`,
                                                        borderRadius: '6px',
                                                        padding: '6px 8px',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '4px'
                                                    }}
                                                    onMouseOver={e=> {e.currentTarget.style.background='rgba(255,255,255,0.08)'; e.currentTarget.style.transform='translateY(-2px)'}}
                                                    onMouseOut={e=> {e.currentTarget.style.background='rgba(255,255,255,0.03)'; e.currentTarget.style.transform='translateY(0)'}}
                                                    >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                            <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                                                                <span style={{fontSize: '0.8rem'}}>{getPlatformIcon(p.platform)}</span>
                                                                <span style={{fontSize:'0.7rem', fontWeight: 600, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80px'}}>{p.brand_name}</span>
                                                            </div>
                                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.status === 'APPROVED' ? '#2ecc71' : '#f59e0b', boxShadow: p.status === 'APPROVED' ? '0 0 5px #2ecc71' : 'none' }}></div>
                                                        </div>
                                                        <span style={{fontSize: '0.7rem', color: '#94a3b8'}}>
                                                            {new Intl.DateTimeFormat('es-CR', { timeZone: 'America/Costa_Rica', hour: '2-digit', minute: '2-digit' }).format(new Date(p.scheduled_for))}
                                                        </span>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Read-Only Modal Post */}
            {selectedPost && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '2rem' }}>
                     <div className="glass-card" style={{ width: '600px', maxWidth: '100%', background: 'rgba(24, 24, 27, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '0', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
                         
                         <div style={{ padding: '2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: `linear-gradient(90deg, rgba(255,255,255,0.02) 0%, transparent 100%)`, borderLeft: `6px solid ${selectedPost.brand_colors?.[0] || '#6366f1'}` }}>
                              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px'}}>
                                  <h3 style={{margin: 0, fontSize: '1.4rem', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px'}}>
                                      {getPlatformIcon(selectedPost.platform)} {selectedPost.brand_name}
                                  </h3>
                                  <span style={{background: selectedPost.status === 'APPROVED' ? 'rgba(46, 204, 113, 0.2)' : 'rgba(245, 158, 11, 0.2)', color: selectedPost.status === 'APPROVED' ? '#2ecc71' : '#f59e0b', padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, border: `1px solid ${selectedPost.status === 'APPROVED' ? 'rgba(46, 204, 113, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`}}>
                                      {selectedPost.status === 'APPROVED' ? '✓ APROBADO' : 'PENDIENTE'}
                                  </span>
                              </div>
                              <div style={{display: 'flex', gap: '15px', color: '#94a3b8', fontSize: '0.85rem'}}>
                                  <span>🗓 {new Intl.DateTimeFormat('es-CR', { timeZone: 'America/Costa_Rica', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(selectedPost.scheduled_for))}</span>
                                  {selectedPost.approved_at && (
                                     <span>🛡 Aprobado: {new Intl.DateTimeFormat('es-CR', { timeZone: 'America/Costa_Rica', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(selectedPost.approved_at))}</span>
                                  )}
                              </div>
                         </div>

                         <div style={{ padding: '2rem', display: 'flex', gap: '1.5rem', maxHeight: '50vh', overflowY: 'auto' }} className="premium-scrollbar">
                              <div style={{flex: 1}}>
                                  <h4 style={{fontSize: '0.75rem', textTransform: 'uppercase', color: '#cbd5e1', letterSpacing: '1px', marginBottom: '8px'}}>✍️ Contenido</h4>
                                  <div style={{background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', color: '#e2e8f0', fontSize: '0.9rem', lineHeight: '1.6', whiteSpace: 'pre-wrap'}}>
                                      {selectedPost.copy}
                                  </div>
                              </div>
                              <div style={{flex: 1}}>
                                  <h4 style={{fontSize: '0.75rem', textTransform: 'uppercase', color: '#cbd5e1', letterSpacing: '1px', marginBottom: '8px'}}>🖼 Visual</h4>
                                  {selectedPost.video_url ? (
                                       <video src={selectedPost.video_url} controls loop autoPlay style={{width: '100%', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 15px rgba(0,0,0,0.3)'}} />
                                  ) : selectedPost.image_url ? (
                                      <img src={selectedPost.image_url} alt="Media" style={{width: '100%', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 4px 15px rgba(0,0,0,0.3)'}} />
                                  ) : (
                                      <div style={{background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '8px', color: '#64748b', fontSize: '0.8rem', fontStyle: 'italic', height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center'}}>
                                          Sin material gráfico generado.<br/>(Pendiente de Dirección de Arte)
                                      </div>
                                  )}
                              </div>
                         </div>

                         <div style={{ padding: '1.5rem 2rem', background: 'rgba(0,0,0,0.4)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                             <button onClick={() => setSelectedPost(null)} style={{ padding: '10px 24px', background: 'transparent', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Cerrar</button>
                             <Link href={`/studio?brandId=${selectedPost.brand_id}`} style={{ padding: '10px 24px', background: '#e2e8f0', color: '#0f172a', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                                 Saltar al Workspace ↗
                             </Link>
                         </div>
                     </div>
                </div>
            )}
            
            <style jsx global>{`
                .premium-scrollbar::-webkit-scrollbar { width: 6px; }
                .premium-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .premium-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
                .premium-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
            `}</style>
        </main>
    )
}

const navBtnStyle = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', width: '36px', height: '36px', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1.2rem', cursor: 'pointer' };
