'use client';
import { apiFetch } from '@/lib/api';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { Suspense } from 'react';

function StudioBoardContent() {
    const searchParams = useSearchParams();
    const brandIdStr = searchParams.get('brandId') || '1';
    const brandId = parseInt(brandIdStr, 10);

    const [brandInfo, setBrandInfo] = useState<any>(null);
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [socialStatus, setSocialStatus] = useState<any>(null);
    
    // Configuración Generación Modal
    const [showGenerateSetup, setShowGenerateSetup] = useState(false);
    const [postCounts, setPostCounts] = useState<any>({});

    // Modal states Modal Post Approval
    const [editingPost, setEditingPost] = useState<any>(null);
    const [editCopy, setEditCopy] = useState('');
    const [editPrompt, setEditPrompt] = useState('');
    const [editDate, setEditDate] = useState('');
    const [editPlatform, setEditPlatform] = useState('');
    const [editMediaType, setEditMediaType] = useState('IMAGE');
    const [editMediaUrls, setEditMediaUrls] = useState<string[]>([]);
    const [generatingImage, setGeneratingImage] = useState(false);
    const [generatingProImage, setGeneratingProImage] = useState(false);
    const [generatingVideo, setGeneratingVideo] = useState(false);
    const [statusFilter, setStatusFilter] = useState('PENDING_APPROVAL');
    const [editReferenceImage, setEditReferenceImage] = useState<string | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            // Cargar Info de Marca
            const brandRes = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/brands/${brandId}`);
            const brandData = await brandRes.json();
            setBrandInfo(brandData);

            // Cargar Posts
            const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/ai/posts/${brandId}`);
            const data = await res.json();
            setPosts(data);

            // Cargar estado de redes
            const socialRes = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/social/status/${brandId}`);
            if(socialRes.ok){
                const sData = await socialRes.json();
                setSocialStatus(sData);
            }
        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [brandId]);

    const handleOpenGenerateSetup = () => {
        if (!brandInfo) return;
        const initialCounts: any = {};
        if (brandInfo.active_platforms && brandInfo.active_platforms.length > 0) {
            brandInfo.active_platforms.forEach((p: string) => initialCounts[p] = 1);
        } else {
             initialCounts['Facebook'] = 1;
        }
        setPostCounts(initialCounts);
        setShowGenerateSetup(true);
    };

    const generateBatch = async () => {
        setShowGenerateSetup(false);
        setGenerating(true);
        try {
            await apiFetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/ai/generate-batch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ brand_id: brandId, post_counts: postCounts })
            });
            await loadData();
        } catch (e) {
            console.error(e);
            alert("Error generando batch");
        }
        setGenerating(false);
    };

    const handleApprove = async () => {
        if (!editingPost) return;
        try {
            await apiFetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/ai/posts/${editingPost.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    copy: editCopy, 
                    media_prompt: editPrompt, 
                    status: 'APPROVED',
                    platform: editPlatform,
                    media_type: editMediaType,
                    media_urls: editMediaUrls,
                    scheduled_for: new Date(editDate).toISOString()
                })
            });
            setEditingPost(null);
            loadData();
        } catch (e) {
            console.error(e);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Eliminar esta publicación? No podrás recuperarla.')) return;
        try {
            await apiFetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/ai/posts/${id}`, { method: 'DELETE' });
            if (editingPost && editingPost.id === id) setEditingPost(null);
            loadData();
        } catch (e) {
            console.error(e);
        }
    };

    const openEditModal = (post: any) => {
        setEditingPost(post); 
        setEditCopy(post.copy); 
        setEditPrompt(post.media_prompt);
        setEditPlatform(post.platform || 'Facebook');
        setEditMediaType(post.media_type || 'IMAGE');
        setEditMediaUrls(post.media_urls || []);
        const d = new Date(post.scheduled_for); 
        // Convert to local YYYY-MM-DDThh:mm
        const dStr = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,16);
        setEditDate(dStr);
        setEditReferenceImage(null);
    };

    const generateImage = async () => {
        if (!editingPost) return;
        setGeneratingImage(true);
        try {
            const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/ai/posts/${editingPost.id}/generate-image`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ media_prompt: editPrompt, reference_image_b64: editReferenceImage })
            });
            const data = await res.json();
            if(data.image_url) {
                if (editMediaType === 'CAROUSEL') {
                    setEditMediaUrls(prev => [...prev, data.image_url]);
                } else {
                    setEditingPost({...editingPost, image_url: data.image_url, media_prompt: editPrompt});
                    setPosts(posts.map(p => p.id === editingPost.id ? {...p, image_url: data.image_url, media_prompt: editPrompt} : p));
                }
            } else {
                alert("Error: " + data.detail);
            }
        } catch (e) {
            console.error(e);
            alert("Error al contactar API de Imagen");
        }
        setGeneratingImage(false);
    };

    const generateProImage = async () => {
        if (!editingPost) return;
        setGeneratingProImage(true);
        try {
            const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/ai/posts/${editingPost.id}/generate-image-pro`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ media_prompt: editPrompt, reference_image_b64: editReferenceImage })
            });
            const data = await res.json();
            if(data.image_url) {
                if (editMediaType === 'CAROUSEL') {
                    setEditMediaUrls(prev => [...prev, data.image_url]);
                } else {
                    setEditingPost({...editingPost, image_url: data.image_url, media_prompt: editPrompt});
                    setPosts(posts.map(p => p.id === editingPost.id ? {...p, image_url: data.image_url, media_prompt: editPrompt} : p));
                }
            } else {
                alert("Error: " + data.detail);
            }
        } catch (e) {
            console.error(e);
            alert("Error al contactar API de Imagen Pro");
        }
        setGeneratingProImage(false);
    };

    const generateVideo = async () => {
        if (!editingPost) return;
        setGeneratingVideo(true);
        try {
            const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/ai/posts/${editingPost.id}/generate-video`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ media_prompt: editPrompt, reference_image_b64: editReferenceImage })
            });
            const data = await res.json();
            if(data.video_url) {
                setEditingPost({...editingPost, video_url: data.video_url, image_url: null, media_prompt: editPrompt});
                setPosts(posts.map(p => p.id === editingPost.id ? {...p, video_url: data.video_url, image_url: null, media_prompt: editPrompt} : p));
            } else {
                alert("Error: " + data.detail);
            }
        } catch (e) {
            console.error(e);
            alert("Error al contactar API de Veo");
        }
        setGeneratingVideo(false);
    };

    const formatDate = (dateStr: string) => {
        if(!dateStr) return '';
        const d = new Date(dateStr);
        return new Intl.DateTimeFormat('es-CR', { timeZone: 'America/Costa_Rica', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d);
    };

    // UI Custom Calendar State
    const [showDatePicker, setShowDatePicker] = useState(false);
    
    // Helper to generate days
    const currentEditDateObj = editDate ? new Date(editDate) : new Date();
    const [calendarMonth, setCalendarMonth] = useState(currentEditDateObj.getMonth());
    const [calendarYear, setCalendarYear] = useState(currentEditDateObj.getFullYear());

    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
    
    const handleDayClick = (day: number) => {
        const d = new Date(editDate || new Date());
        d.setFullYear(calendarYear);
        d.setMonth(calendarMonth);
        d.setDate(day);
        const tzAdjusted = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,16);
        setEditDate(tzAdjusted);
    };

    const handleTimeChange = (type: 'hours' | 'minutes', value: string) => {
        const d = new Date(editDate || new Date());
        if (type === 'hours') d.setHours(parseInt(value));
        if (type === 'minutes') d.setMinutes(parseInt(value));
        const tzAdjusted = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,16);
        setEditDate(tzAdjusted);
    };

    return (
        <main className="studio-layout" style={{ display: 'flex', minHeight: '100vh', fontFamily: 'var(--font-inter)' }}>
            
            {/* PANEL LATERAL: Control AI */}
            <aside className="studio-sidebar" style={{ width: '300px', background: 'rgba(255,255,255,0.02)', borderRight: '1px solid rgba(255,255,255,0.05)', padding: '2rem', display: 'flex', flexDirection: 'column' }}>
                <Link href="/" style={{ color: '#a1a1aa', textDecoration: 'none', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '8px', transition: 'color 0.2s' }}
                      onMouseOver={e => e.currentTarget.style.color = '#fff'}
                      onMouseOut={e => e.currentTarget.style.color = '#a1a1aa'}>
                    ← Volver al Dashboard
                </Link>
                
                <div style={{ marginTop: '3rem' }}>
                    <h1 style={{ fontSize: '1.5rem', margin: '0 0 1rem 0' }}>{brandInfo ? brandInfo.name : 'Cargando...'}</h1>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <Link href={`/studio/settings?brandId=${brandId}`} style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', padding: '10px', borderRadius: '8px', fontSize: '0.9rem', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.1)' }}>
                            ⚙️ Ajustar ADN de Marca
                        </Link>
                        <Link href={`/metrics?brandId=${brandId}`} style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', padding: '10px', borderRadius: '8px', fontSize: '0.9rem', textDecoration: 'none', border: '1px solid rgba(255,255,255,0.1)' }}>
                            📊 Ver Estadísticas
                        </Link>
                        <a href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/social/meta_login?brand_id=${brandId}`} style={{ background: (socialStatus?.platforms?.includes('facebook') || socialStatus?.platforms?.includes('instagram')) ? 'rgba(46, 204, 113, 0.1)' : 'rgba(56, 189, 248, 0.1)', color: (socialStatus?.platforms?.includes('facebook') || socialStatus?.platforms?.includes('instagram')) ? '#2ecc71' : '#38bdf8', padding: '10px', borderRadius: '8px', fontSize: '0.9rem', textDecoration: 'none', border: `1px solid ${(socialStatus?.platforms?.includes('facebook') || socialStatus?.platforms?.includes('instagram')) ? 'rgba(46, 204, 113, 0.3)' : 'rgba(56, 189, 248, 0.3)'}` }}>
                            {(socialStatus?.platforms?.includes('facebook') || socialStatus?.platforms?.includes('instagram')) ? `✅ Meta Conectado` : '🔗 Meta / IG'}
                        </a>
                        <a href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/social/tiktok_login?brand_id=${brandId}`} style={{ background: socialStatus?.platforms?.includes('tiktok') ? 'rgba(46, 204, 113, 0.1)' : 'rgba(236, 72, 153, 0.1)', color: socialStatus?.platforms?.includes('tiktok') ? '#2ecc71' : '#ec4899', padding: '10px', borderRadius: '8px', fontSize: '0.9rem', textDecoration: 'none', border: `1px solid ${socialStatus?.platforms?.includes('tiktok') ? 'rgba(46, 204, 113, 0.3)' : 'rgba(236, 72, 153, 0.3)'}` }}>
                            {socialStatus?.platforms?.includes('tiktok') ? `✅ TikTok Conectado` : '🎵 Conectar TikTok'}
                        </a>
                    </div>
                </div>

                <div style={{ marginTop: '2rem' }}>
                    <button 
                        onClick={handleOpenGenerateSetup} 
                        disabled={generating || loading}
                        className="btn-primary"
                        style={{ 
                            width: '100%',
                            background: generating ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                            color: generating ? '#a1a1aa' : 'white',
                            border: 'none',
                            padding: '14px',
                            borderRadius: '12px',
                            fontWeight: '600',
                            cursor: generating ? 'wait' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        {generating ? (
                           <> <div style={{width: '20px', height: '20px', border: '3px solid', borderColor: 'transparent #fff #fff #fff', borderRadius: '50%', animation: 'spin 1s linear infinite'}} /> Trabajando... </>
                        ) : '✨ Generar Lote'}
                    </button>
                </div>
            </aside>

            {/* ZONA CENTRAL: Calendario & Tablero */}
            <section style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column' }}>
                
                {loading && (
                    <div style={{ textAlign: 'center', color: '#a1a1aa', padding: '4rem' }}>
                        <div style={{width: '40px', height: '40px', border: '3px solid', borderColor: 'transparent var(--primary) var(--primary) var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem'}} />
                        Sincronizando calendario de la marca...
                    </div>
                )}

                {/* Header de Parrilla con Filtros */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem', marginTop: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Calendario de Aprobación</h2>
                    <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <button onClick={() => setStatusFilter('PENDING_APPROVAL')} style={{ padding: '8px 20px', background: statusFilter === 'PENDING_APPROVAL' ? 'rgba(245, 158, 11, 0.15)' : 'transparent', color: statusFilter === 'PENDING_APPROVAL' ? '#fbbf24' : '#a1a1aa', border: '1px solid', borderColor: statusFilter === 'PENDING_APPROVAL' ? 'rgba(245, 158, 11, 0.3)' : 'transparent', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}>Pendientes</button>
                        <button onClick={() => setStatusFilter('APPROVED')} style={{ padding: '8px 20px', background: statusFilter === 'APPROVED' ? 'rgba(46, 204, 113, 0.15)' : 'transparent', color: statusFilter === 'APPROVED' ? '#2ecc71' : '#a1a1aa', border: '1px solid', borderColor: statusFilter === 'APPROVED' ? 'rgba(46, 204, 113, 0.3)' : 'transparent', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}>Aprobados</button>
                        <button onClick={() => setStatusFilter('ALL')} style={{ padding: '8px 20px', background: statusFilter === 'ALL' ? 'rgba(255, 255, 255, 0.1)' : 'transparent', color: statusFilter === 'ALL' ? '#f8fafc' : '#a1a1aa', border: '1px solid', borderColor: statusFilter === 'ALL' ? 'rgba(255,255,255,0.1)' : 'transparent', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}>Todos</button>
                    </div>
                </div>

                {!loading && posts.length === 0 && !generating && (
                    <div className="glass-card" style={{ textAlign: 'center', padding: '5rem 2rem', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '1.5rem', filter: 'grayscale(0.5)' }}>🤖</div>
                        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#fff' }}>No hay posts pendientes</h2>
                        <p style={{ color: '#a1a1aa', maxWidth: '400px', margin: '0 auto', lineHeight: '1.5' }}>
                            Haz clic en "Generar Lote Inteligente", define tu cuota por red social, y deja que Gemini estructure toda tu campaña en minutos guiada por el ADN.
                        </p>
                    </div>
                )}
                
                {/* Grid de Tarjetas */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
                    {posts.filter(p => statusFilter === 'ALL' || p.status === statusFilter).map(post => (
                        <div key={post.id} className="glass-card" style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            position: 'relative', 
                            padding: '0', 
                            overflow: 'hidden',
                            borderColor: post.status === 'APPROVED' ? 'rgba(46, 204, 113, 0.4)' : 'rgba(245, 158, 11, 0.3)',
                            boxShadow: post.status === 'APPROVED' ? '0 10px 40px rgba(46, 204, 113, 0.05)' : '0 10px 30px rgba(0,0,0,0.2)'
                        }}>
                            
                            <div style={{ 
                                position: 'absolute', top: 12, right: 12, 
                                background: post.status === 'APPROVED' ? 'rgba(46, 204, 113, 0.9)' : post.status === 'PUBLISHED' ? 'rgba(56, 189, 248, 0.9)' : post.status === 'FAILED' ? 'rgba(239, 68, 68, 0.9)' : 'rgba(245, 158, 11, 0.9)', 
                                color: (post.status === 'APPROVED' || post.status === 'PUBLISHED' || post.status === 'FAILED') ? '#fff' : '#000', 
                                fontSize: '0.75rem', padding: '4px 10px', borderRadius: '20px', fontWeight: 'bold',
                                backdropFilter: 'blur(4px)', zIndex: 10
                            }}>
                                {post.status === 'APPROVED' ? '✓ APROBADO' : post.status === 'PUBLISHED' ? '🚀 PUBLICADO' : post.status === 'FAILED' ? '❌ ERROR API' : '● REVISIÓN PENDIENTE'}
                            </div>

                            {post.video_url ? (
                                <div style={{ position: 'relative', width: '100%', height: '220px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                    <video src={post.video_url} autoPlay loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(239, 68, 68, 0.8)', backdropFilter: 'blur(4px)', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '1px' }}>REEL</div>
                                </div>
                            ) : post.image_url ? (
                                <img src={post.image_url} alt="Generado" style={{ width: '100%', height: '220px', objectFit: 'cover', borderBottom: '1px solid rgba(255,255,255,0.05)' }} />
                            ) : (
                                <div style={{ width: '100%', height: '220px', background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0) 100%)', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', padding: '1rem', overflowY: 'auto' }}>
                                    <span style={{fontSize:'1.5rem', marginBottom:'0.5rem', opacity: 0.5}}>🎨 Boceto</span>
                                    <span style={{fontSize:'0.85rem', color:'#fff', fontStyle:'italic', opacity: 0.8, lineHeight: '1.5', textAlign: 'left'}}>"{post.media_prompt}"</span>
                                </div>
                            )}

                            <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#a1a1aa', marginBottom: '1rem' }}>
                                    <span style={{background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '4px'}}>{post.platform}</span>
                                    <span>🗓 {formatDate(post.scheduled_for)}</span>
                                </div>

                                <div style={{ flex: 1, fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: '1.6', color: '#e4e4e7' }}>
                                    {post.copy.length > 150 ? post.copy.substring(0, 150) + '...' : post.copy}
                                </div>
                                
                                {post.approved_at && (
                                    <div style={{fontSize: '0.75rem', color: '#a1a1aa', marginBottom: '1rem', fontStyle: 'italic'}}>
                                        Aprobación humana: {formatDate(post.approved_at)}
                                    </div>
                                )}

                                {post.status === 'PENDING_APPROVAL' ? (
                                    <button 
                                        onClick={() => openEditModal(post)}
                                        style={{ background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px', cursor: 'pointer', width: '100%', fontWeight: '600', transition: 'all 0.2s', marginBottom: '8px' }}
                                        onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }}
                                        onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
                                    >
                                        Revisar y Concretar Arte →
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => openEditModal(post)}
                                        style={{ background: 'transparent', color: '#2ecc71', border: '1px solid rgba(46, 204, 113, 0.3)', padding: '12px', borderRadius: '8px', cursor: 'pointer', width: '100%', fontWeight: '600', transition: 'all 0.2s', marginBottom: '8px' }}
                                        onMouseOver={e => e.currentTarget.style.background = 'rgba(46, 204, 113, 0.1)'}
                                        onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        Revisar Arte / Editar
                                    </button>
                                )}
                                <button onClick={() => handleDelete(post.id)} style={{background: 'transparent', color: '#ef4444', border: 'none', cursor: 'pointer', fontSize: '0.8rem', padding: '4px'}}>🗑 Eliminar</button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* MODAL: Configurar Generación AI */}
            {showGenerateSetup && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }}>
                    <div className="glass-card generate-modal-content" style={{ width: '500px', maxWidth: '100%', padding: '2rem', borderRadius: '16px', background: '#18181b', border: '1px solid rgba(255,255,255,0.1)' }}>
                         <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Estrategia del Lote</h2>
                         <p style={{color: '#a1a1aa', fontSize: '0.9rem', marginBottom: '2rem'}}>
                            Define exactamente la cantidad de posts para cada red social soportada en el ADN de esta marca.
                         </p>
                         
                         <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                             {Object.keys(postCounts).map(plat => (
                                 <div key={plat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
                                     <span style={{ fontWeight: 600 }}>{plat}</span>
                                     <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                         <button onClick={() => setPostCounts({...postCounts, [plat]: Math.max(0, postCounts[plat] - 1)})} style={{width: '30px', height: '30px', borderRadius: '4px', border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer'}}>-</button>
                                         <span style={{ width: '20px', textAlign: 'center' }}>{postCounts[plat]}</span>
                                         <button onClick={() => setPostCounts({...postCounts, [plat]: postCounts[plat] + 1})} style={{width: '30px', height: '30px', borderRadius: '4px', border: 'none', background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer'}}>+</button>
                                     </div>
                                 </div>
                             ))}
                         </div>
                         
                         <div style={{ display: 'flex', gap: '1rem' }}>
                            <button className="btn-primary" onClick={generateBatch} style={{ flex: 1, background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', padding: '14px', fontSize: '1rem' }}>
                                Iniciar Generación IA ✓
                            </button>
                            <button onClick={() => setShowGenerateSetup(false)} style={{ padding: '14px 24px', background: 'transparent', color: '#a1a1aa', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', cursor: 'pointer' }}>
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Aprobación Individual - HIGH PREMIUM UI */}
            {editingPost && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '2rem' }}>
                    <div className="glass-card" style={{ width: '1000px', maxWidth: '100%', maxHeight: '95vh', display: 'flex', flexDirection: 'column', background: 'rgba(24, 24, 27, 0.85)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', borderRadius: '16px', padding: '0', overflow: 'hidden' }}>
                        
                        {/* Header Premium */}
                        <div style={{ padding: '2rem 2.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                <div style={{width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)'}}>
                                    {editPlatform === 'Facebook' ? '📘' : editPlatform === 'Instagram' ? '📸' : '🎵'}
                                </div>
                                <div>
                                    <h2 style={{ fontSize: '1.4rem', margin: 0, color: '#f8fafc', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        Revivisión: 
                                        <select value={editPlatform} onChange={e => setEditPlatform(e.target.value)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '1.2rem', padding: '4px 12px', borderRadius: '8px', outline: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                                            <option value="Facebook">Facebook</option>
                                            <option value="Instagram">Instagram</option>
                                            <option value="TikTok">TikTok</option>
                                        </select>
                                        <select value={editMediaType} onChange={e => setEditMediaType(e.target.value)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.9rem', padding: '6px 12px', borderRadius: '8px', outline: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, marginLeft: '10px' }}>
                                            <option value="IMAGE">Imagen Regular</option>
                                            <option value="VIDEO">Video</option>
                                            <option value="CAROUSEL">Carrusel</option>
                                            <option value="STORY">Historia (Story)</option>
                                            <option value="REEL">Reel</option>
                                        </select>
                                    </h2>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>Esta publicación se enviará ÚNICAMENTE a esta red.</p>
                                </div>
                            </div>
                            <div style={{ position: 'relative' }}>
                                <button onClick={() => setShowDatePicker(!showDatePicker)} style={{ background: 'rgba(0,0,0,0.3)', padding: '10px 18px', borderRadius: '30px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '10px', color: '#e2e8f0', cursor: 'pointer', outline: 'none', fontWeight: 500 }}>
                                    <span style={{fontSize: '1.2rem', opacity: 0.8}}>🗓</span>
                                    {editDate ? formatDate(new Date(editDate).toISOString()) : 'Seleccionar Fecha'}
                                </button>
                                
                                {showDatePicker && (
                                    <div className="glass-card" style={{ position: 'absolute', top: '110%', right: 0, width: '320px', background: 'rgba(24, 24, 27, 0.95)', backdropFilter: 'blur(20px)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', padding: '1.5rem', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', zIndex: 50 }}>
                                        {/* Header Mes */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', color: '#fff' }}>
                                            <button onClick={() => setCalendarMonth(prev => prev === 0 ? 11 : prev - 1)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.2rem' }}>‹</button>
                                            <span style={{ fontWeight: 600 }}>{new Date(calendarYear, calendarMonth).toLocaleString('es', {month: 'long', year: 'numeric'}).toUpperCase()}</span>
                                            <button onClick={() => setCalendarMonth(prev => prev === 11 ? 0 : prev + 1)} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.2rem' }}>›</button>
                                        </div>
                                        
                                        {/* Grid Dias */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '1rem' }}>
                                            {['Do','Lu','Ma','Mi','Ju','Vi','Sá'].map(day => <span key={day} style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{day}</span>)}
                                            {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
                                            {Array.from({ length: daysInMonth }).map((_, i) => {
                                                const dayNum = i + 1;
                                                const isSelected = editDate && new Date(editDate).getDate() === dayNum && new Date(editDate).getMonth() === calendarMonth && new Date(editDate).getFullYear() === calendarYear;
                                                return (
                                                    <button key={dayNum} onClick={() => handleDayClick(dayNum)} style={{ width: '100%', aspectRatio: '1/1', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSelected ? '#6366f1' : 'transparent', color: isSelected ? '#fff' : '#e2e8f0', border: 'none', borderRadius: '50%', cursor: 'pointer', fontSize: '0.9rem', fontWeight: isSelected ? 700 : 500, transition: 'all 0.2s' }} onMouseOver={e => !isSelected && (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')} onMouseOut={e => !isSelected && (e.currentTarget.style.background = 'transparent')}>
                                                        {dayNum}
                                                    </button>
                                                )
                                            })}
                                        </div>

                                        {/* Selector de Hora */}
                                        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem', display: 'flex', justifyContent: 'center', gap: '10px', alignItems: 'center' }}>
                                            <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Hora:</span>
                                            <select value={editDate ? new Date(editDate).getHours().toString().padStart(2, '0') : '12'} onChange={e => handleTimeChange('hours', e.target.value)} style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '6px 12px', borderRadius: '6px', outline: 'none' }}>
                                                {Array.from({ length: 24 }).map((_, i) => <option key={i} value={i.toString()}>{i.toString().padStart(2, '0')}</option>)}
                                            </select>
                                            <span style={{ color: '#fff' }}>:</span>
                                            <select value={editDate ? new Date(editDate).getMinutes().toString().padStart(2, '0') : '00'} onChange={e => handleTimeChange('minutes', e.target.value)} style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '6px 12px', borderRadius: '6px', outline: 'none' }}>
                                                {Array.from({ length: 60 }).map((_, i) => <option key={i} value={i.toString()}>{i.toString().padStart(2, '0')}</option>)}
                                            </select>
                                        </div>
                                        
                                        <button onClick={() => setShowDatePicker(false)} style={{ width: '100%', marginTop: '1rem', padding: '10px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Listo</button>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* Body Premium */}
                        <div style={{ padding: '2.5rem', display: 'grid', gridTemplateColumns: '55% 40%', gap: '5%', overflowY: 'auto', flex: 1 }} className="premium-scrollbar">
                           
                           {/* Panel Editor Copy */}
                           <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1rem' }}>
                                  <label style={{ color: '#cbd5e1', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>✍️ Cuerpo del Texto (Copy)</label>
                                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{editCopy.length} caracteres</span>
                              </div>
                              <textarea 
                                  value={editCopy}
                                  onChange={(e) => setEditCopy(e.target.value)}
                                  className="premium-scrollbar"
                                  style={{ 
                                      flex: 1, minHeight: '350px', padding: '1.5rem', borderRadius: '12px', 
                                      border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.4)', 
                                      color: '#f8fafc', fontFamily: 'var(--font-inter)', fontSize: '1rem', lineHeight: '1.7', resize: 'vertical',
                                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)', transition: 'border-color 0.2s', outline: 'none'
                                  }}
                                  onFocus={e => e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)'}
                                  onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                               />
                           </div>

                           {brandInfo?.reference_images && brandInfo.reference_images.length > 0 && (
                               <div style={{ display: 'flex', flexDirection: 'column', marginBottom: '1.5rem' }}>
                                   <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.8rem', color: '#cbd5e1', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                       <span>🧝‍♀️ Personaje / Referencia Base</span>
                                       {editReferenceImage && <button onClick={() => setEditReferenceImage(null)} style={{background:'transparent', border:'none', color:'#ef4444', fontSize:'0.7rem', cursor:'pointer'}}>Quitar</button>}
                                   </label>
                                   <div className="premium-scrollbar" style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '5px' }}>
                                       {brandInfo.reference_images.map((imgUrl: string, idx: number) => (
                                           <div 
                                               key={idx} 
                                               onClick={() => setEditReferenceImage(imgUrl === editReferenceImage ? null : imgUrl)}
                                               style={{ 
                                                   minWidth: '70px', height: '70px', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer',
                                                   border: imgUrl === editReferenceImage ? '2px solid #10b981' : '1px solid rgba(255,255,255,0.1)',
                                                   opacity: editReferenceImage && imgUrl !== editReferenceImage ? 0.3 : 1, transition: 'all 0.2s',
                                                   boxShadow: imgUrl === editReferenceImage ? '0 0 15px rgba(16,185,129,0.4)' : 'none'
                                               }}
                                               title="Usar esta imagen como referencia para mantener la consistencia"
                                           >
                                               <img src={imgUrl} alt={`Ref ${idx}`} style={{width:'100%', height:'100%', objectFit:'cover'}} />
                                           </div>
                                       ))}
                                   </div>
                               </div>
                           )}

                           {/* Panel Generador Visual */}
                           <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <label style={{ display: 'block', marginBottom: '1rem', color: '#cbd5e1', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>🖼 Resultado Visual</label>
                              
                              {editMediaType === 'CAROUSEL' ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                                      {editMediaUrls.length > 0 && (
                                          <div className="premium-scrollbar" style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '10px' }}>
                                              {editMediaUrls.map((url, idx) => (
                                                  <div key={idx} style={{ position: 'relative', minWidth: '160px', height: '160px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)' }}>
                                                      {url.startsWith('data:video') || url.endsWith('.mp4') ? (
                                                          <video src={url} autoPlay loop muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                      ) : (
                                                          <img src={url} alt={`Slide ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                      )}
                                                      <button onClick={() => setEditMediaUrls(prev => prev.filter((_, i) => i !== idx))} style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                                                  </div>
                                              ))}
                                          </div>
                                      )}
                                      <div style={{ display: 'flex', gap: '10px' }}>
                                          <button onClick={generateImage} disabled={generatingImage || generatingProImage || generatingVideo} style={{ flex: 1, padding: '12px', background: 'rgba(99, 102, 241, 0.1)', border: '1px dashed rgba(99, 102, 241, 0.4)', color: '#818cf8', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)'} onMouseOut={e => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'}>
                                              {generatingImage ? 'Generando...' : '+ Imagen (Nano 2)'}
                                          </button>
                                          <button onClick={generateProImage} disabled={generatingImage || generatingProImage || generatingVideo} style={{ flex: 1, padding: '12px', background: 'rgba(245, 158, 11, 0.1)', border: '1px dashed rgba(245, 158, 11, 0.4)', color: '#fbbf24', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(245, 158, 11, 0.2)'} onMouseOut={e => e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)'}>
                                              {generatingProImage ? 'Generando...' : '+ Imagen (Pro)'}
                                          </button>
                                          <button onClick={generateVideo} disabled={generatingImage || generatingProImage || generatingVideo} style={{ flex: 1, padding: '12px', background: 'rgba(236, 72, 153, 0.1)', border: '1px dashed rgba(236, 72, 153, 0.4)', color: '#f472b6', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(236, 72, 153, 0.2)'} onMouseOut={e => e.currentTarget.style.background = 'rgba(236, 72, 153, 0.1)'}>
                                              {generatingVideo ? 'Renderizando...' : '+ Video (Veo)'}
                                          </button>
                                      </div>
                                  </div>
                              ) : editingPost.video_url ? (
                                  <div style={{position: 'relative', flex: 1, display: 'flex', flexDirection: 'column'}}>
                                      <video src={editingPost.video_url} controls loop autoPlay style={{ width: '100%', height: '100%', minHeight: '220px', objectFit: 'cover', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }} />
                                      <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: '8px' }}>
                                           <span style={{background: 'rgba(239, 68, 68, 0.8)', backdropFilter: 'blur(4px)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700}}>REC</span>
                                      </div>
                                      <div style={{ position: 'absolute', bottom: 12, right: 12, display: 'flex', gap: '8px' }}>
                                          <button onClick={generateVideo} disabled={generatingImage || generatingProImage || generatingVideo} style={{ background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(4px)', color: 'white', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(15, 23, 42, 1)'} onMouseOut={e => e.currentTarget.style.background = 'rgba(15, 23, 42, 0.8)'}>
                                               {generatingVideo ? <><div style={{width: '12px', height: '12px', border: '2px solid', borderColor: 'transparent #fff #fff #fff', borderRadius: '50%', animation: 'spin 1s linear infinite'}} /> Filmando...</> : '🎬 Re-grabar Reel'}
                                          </button>
                                          <button onClick={generateImage} disabled={generatingImage || generatingProImage || generatingVideo} style={{ background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(4px)', color: 'white', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                Volver a Foto
                                          </button>
                                      </div>
                                  </div>
                              ) : editingPost.image_url ? (
                                  <div style={{position: 'relative', flex: 1, display: 'flex', flexDirection: 'column'}}>
                                      <img src={editingPost.image_url} alt="Generado" style={{ width: '100%', height: '100%', minHeight: '220px', objectFit: 'cover', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 25px rgba(0,0,0,0.3)' }} />
                                      <div style={{ position: 'absolute', bottom: 12, right: 12, display: 'flex', gap: '8px' }}>
                                          <button onClick={generateImage} disabled={generatingImage || generatingProImage || generatingVideo} style={{ background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(4px)', color: 'white', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(15, 23, 42, 1)'} onMouseOut={e => e.currentTarget.style.background = 'rgba(15, 23, 42, 0.8)'}>
                                               {generatingImage ? <><div style={{width: '12px', height: '12px', border: '2px solid', borderColor: 'transparent #fff #fff #fff', borderRadius: '50%', animation: 'spin 1s linear infinite'}} /> ...</> : '🔄 Re-generar (Nano 2)'}
                                          </button>
                                          <button onClick={generateProImage} disabled={generatingImage || generatingProImage || generatingVideo} style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', boxShadow: '0 4px 15px rgba(245, 158, 11, 0.4)', color: '#000', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
                                               {generatingProImage ? <><div style={{width: '12px', height: '12px', border: '2px solid', borderColor: 'transparent #000 #000 #000', borderRadius: '50%', animation: 'spin 1s linear infinite'}} /> Cargando...</> : '👑 Redo with Pro'}
                                          </button>
                                          <button onClick={generateVideo} disabled={generatingImage || generatingProImage || generatingVideo} style={{ background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)', boxShadow: '0 4px 15px rgba(236, 72, 153, 0.4)', color: '#fff', padding: '8px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
                                               {generatingVideo ? 'Filtrando...' : '🎬 Hacer Reel'}
                                          </button>
                                      </div>
                                  </div>
                              ) : (
                                  <div style={{ display: 'flex', gap: '15px' }}>
                                      <button onClick={generateImage} disabled={generatingImage || generatingProImage || generatingVideo} style={{ flex: 1, minHeight: '220px', background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)', color: '#cbd5e1', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '15px', transition: 'all 0.3s' }} onMouseOver={e => {e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)'}} onMouseOut={e => {e.currentTarget.style.background = 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'}}>
                                          {generatingImage ? (
                                              <><div style={{width: '40px', height: '40px', border: '3px solid', borderColor: 'transparent #6366f1 #6366f1 #6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite'}} /> <span style={{fontSize: '0.9rem', color: '#94a3b8'}}>Renderizando con Nano Banana 2...</span></>
                                          ) : (
                                              <><div style={{width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', color: '#818cf8', boxShadow: '0 4px 15px rgba(99,102,241,0.2)'}}>📸</div> <div style={{textAlign: 'center'}}><span style={{display: 'block', fontSize: '1rem', fontWeight: 600, color: '#f8fafc', marginBottom: '4px'}}>Arte Estático</span><span style={{fontSize: '0.8rem', color: '#64748b'}}>Fotografía (Nano Banana 2)</span></div></>
                                          )}
                                      </button>
                                      
                                      <button onClick={generateVideo} disabled={generatingImage || generatingProImage || generatingVideo} style={{ flex: 1, minHeight: '220px', background: 'linear-gradient(180deg, rgba(236, 72, 153, 0.05) 0%, rgba(236, 72, 153, 0.01) 100%)', color: '#cbd5e1', border: '1px dashed rgba(236, 72, 153, 0.2)', borderRadius: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '15px', transition: 'all 0.3s' }} onMouseOver={e => {e.currentTarget.style.background = 'rgba(236, 72, 153, 0.1)'; e.currentTarget.style.borderColor = 'rgba(236, 72, 153, 0.6)'}} onMouseOut={e => {e.currentTarget.style.background = 'linear-gradient(180deg, rgba(236, 72, 153, 0.05) 0%, rgba(236, 72, 153, 0.01) 100%)'; e.currentTarget.style.borderColor = 'rgba(236, 72, 153, 0.2)'}}>
                                          {generatingVideo ? (
                                              <><div style={{width: '40px', height: '40px', border: '3px solid', borderColor: 'transparent #ec4899 #ec4899 #ec4899', borderRadius: '50%', animation: 'spin 1s linear infinite'}} /> <span style={{fontSize: '0.9rem', color: '#fbcfe8'}}>Filmando con Veo 2.0...</span></>
                                          ) : (
                                              <><div style={{width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(236, 72, 153, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', color: '#f472b6', boxShadow: '0 4px 15px rgba(236,72,153,0.3)'}}>🎬</div> <div style={{textAlign: 'center'}}><span style={{display: 'block', fontSize: '1rem', fontWeight: 600, color: '#fff', marginBottom: '4px'}}>Producir Reel</span><span style={{fontSize: '0.8rem', color: '#fbcfe8'}}>Cinematografía (Veo 2.0)</span></div></>
                                          )}
                                      </button>
                                  </div>
                              )}

                              <label style={{ display: 'block', marginTop: '1.5rem', marginBottom: '1rem', color: '#cbd5e1', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>🎨 Prompt de Dirección de Arte</label>
                              <textarea 
                                  value={editPrompt}
                                  onChange={(e) => setEditPrompt(e.target.value)}
                                  className="premium-scrollbar"
                                  style={{ 
                                      width: '100%', height: '120px', padding: '1rem', borderRadius: '12px', 
                                      border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', 
                                      color: '#94a3b8', fontFamily: 'var(--font-inter)', fontSize: '0.85rem', lineHeight: '1.5', resize: 'vertical', outline: 'none'
                                  }}
                                  onFocus={e => e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)'}
                                  onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'}
                              />

                              {editingPost.platform_log && (
                                  <div style={{ marginTop: '1.5rem', gridColumn: '1 / -1' }}>
                                      <h4 style={{fontSize: '0.75rem', textTransform: 'uppercase', color: editingPost.status === 'FAILED' ? '#ef4444' : '#cbd5e1', letterSpacing: '1px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px'}}>
                                          {editingPost.status === 'FAILED' ? '🚨' : '📃'} Bitácora del Servidor
                                      </h4>
                                      <div className="premium-scrollbar" style={{background: editingPost.status === 'FAILED' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', border: `1px solid ${editingPost.status === 'FAILED' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255,255,255,0.05)'}`, color: editingPost.status === 'FAILED' ? '#fca5a5' : '#94a3b8', fontSize: '0.75rem', lineHeight: '1.5', whiteSpace: 'pre-wrap', wordBreak: 'break-all', overflowY: 'auto', overflowX: 'hidden', maxHeight: '180px', fontFamily: 'monospace'}}>
                                          {editingPost.platform_log}
                                      </div>
                                  </div>
                              )}
                           </div>
                        </div>

                        {/* Footer Premium */}
                        <div style={{ padding: '1.5rem 2.5rem', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
                            <button onClick={() => setEditingPost(null)} style={{ padding: '14px 28px', background: 'transparent', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s', fontSize: '0.95rem' }} onMouseOver={e => {e.currentTarget.style.color='#fff'; e.currentTarget.style.background='rgba(255,255,255,0.05)'}} onMouseOut={e => {e.currentTarget.style.color='#94a3b8'; e.currentTarget.style.background='transparent'}}>
                                Cancelar
                            </button>
                            <button className="btn-primary" onClick={handleApprove} style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', padding: '14px 32px', fontSize: '0.95rem', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.2), 0 4px 15px rgba(16, 185, 129, 0.3)', border: 'none', cursor: 'pointer', color: '#fff', fontWeight: 600 }}>
                                <span>Autorizar y Encolar Publicación</span>
                                <span>✓</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            <style jsx global>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .premium-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .premium-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .premium-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255,255,255,0.1);
                    border-radius: 10px;
                }
                .premium-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255,255,255,0.2);
                }
            `}</style>
        </main>
    )
}

export default function StudioBoard() {
    return (
        <Suspense fallback={<div style={{padding: '5rem', textAlign: 'center', color: '#fff'}}>Cargando Estudio de IA...</div>}>
            <StudioBoardContent />
        </Suspense>
    );
}
