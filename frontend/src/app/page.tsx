'use client';
import { apiFetch } from '@/lib/api';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [brands, setBrands] = useState<any[]>([]);
  const router = useRouter();

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // ADN ADN Form State
  const [name, setName] = useState('');
  const [audience, setAudience] = useState('');
  const [voice, setVoice] = useState('');
  const [products, setProducts] = useState('');
  const [masterPrompt, setMasterPrompt] = useState('');
  const [newsTrend, setNewsTrend] = useState('');
  const [platforms, setPlatforms] = useState({ Facebook: false, Instagram: false, TikTok: false });
  const [colors, setColors] = useState('');
  const [referenceImages, setReferenceImages] = useState<string[]>([]);

  useEffect(() => {
    apiFetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/brands/`)
      .then(res => res.json())
      .then(data => setBrands(data))
      .catch(console.error);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;
      Array.from(files).forEach(file => {
          const reader = new FileReader();
          reader.onload = (event) => {
              if(event.target?.result) setReferenceImages(prev => [...prev, event.target!.result as string]);
          };
          reader.readAsDataURL(file);
      });
  };

  const handleDeleteBrand = async (e: React.MouseEvent, id: number) => {
      e.preventDefault();
      e.stopPropagation();
      if (!window.confirm("🔴 ALERTA: ¿Estás seguro de eliminar esta Marca? Esto destruirá TODOS sus posts de IA, historiales y conexiones sociales (Meta/TikTok) para siempre.")) return;
      
      try {
          const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/brands/${id}`, { method: 'DELETE' });
          if(res.ok) {
              setBrands(prev => prev.filter((b: any) => b.id !== id));
          } else {
              alert("Error eliminando marca");
          }
      } catch(err) {
          console.error(err);
      }
  };

  const handleCreateBrand = async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      
      const activePlatformArray = Object.keys(platforms).filter((key: any) => (platforms as any)[key]);
      const colorArray = colors.split(',').map(c => c.trim()).filter(c => c.length > 0);
      
      const payload = {
          name,
          target_audience: audience,
          brand_voice_prompt: voice,
          products_promotions: products,
          master_prompt: masterPrompt,
          news_trend: newsTrend,
          active_platforms: activePlatformArray,
          visual_identity: { colors: colorArray },
          reference_images: referenceImages
      };

      try {
          const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/brands/`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });
          const newBrand = await res.json();
          router.push(`/studio?brandId=${newBrand.id}`);
      } catch (e) {
          console.error(e);
          alert("Error creando la marca.");
      }
      setSaving(false);
  };

  const togglePlatform = (p: string) => setPlatforms({...platforms, [p]: !(platforms as any)[p]});

  const closeModal = () => {
      setShowCreateModal(false);
      // Reset form
      setName(''); setAudience(''); setVoice(''); setProducts(''); setMasterPrompt('');
      setNewsTrend(''); setPlatforms({ Facebook: false, Instagram: false, TikTok: false });
      setColors(''); setReferenceImages([]);
  };

  return (
    <main style={{ padding: '4rem 2rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'var(--font-inter)' }}>
      <header style={{ textAlign: 'center', marginBottom: '4rem' }}>
        <h1 className="hero-title">G-MKT AI</h1>
        <p style={{ color: '#a1a1aa', fontSize: '1.25rem', maxWidth: '600px', margin: '0 auto', marginBottom: '2rem' }}>
          Estrategia, planificación y automatización de redes sociales.
        </p>
        <Link href="/calendar" style={{ display: 'inline-block', padding: '12px 24px', background: 'rgba(255,255,255,0.05)', color: '#fff', textDecoration: 'none', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', fontWeight: 600, transition: 'all 0.2s', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
           🌍 Ver Calendario Global Multi-Marca
        </Link>
      </header>

      <section>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '2rem', textAlign: 'center' }}>Selecciona tu Workspace (Marca)</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem' }}>
          
          {brands.map((b) => (
            <Link href={`/studio?brandId=${b.id}`} key={b.id} style={{textDecoration:'none', color:'inherit'}}>
                <div className="glass-card" style={{ position: 'relative', cursor: 'pointer', transition: 'transform 0.2s', border: '1px solid rgba(255,255,255,0.05)' }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
                  <button onClick={(e) => handleDeleteBrand(e, b.id)} style={{ position: 'absolute', top: '15px', right: '15px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#ef4444', borderRadius: '8px', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, transition: 'background 0.2s' }} onMouseOver={e=>e.currentTarget.style.background='rgba(239, 68, 68, 0.3)'} onMouseOut={e=>e.currentTarget.style.background='rgba(239, 68, 68, 0.1)'}>
                      🗑️
                  </button>
                  <h3 style={{ fontSize: '1.3rem', marginBottom: '0.8rem', color: b.visual_identity?.colors?.[0] || '#fff', paddingRight: '40px' }}>{b.name}</h3>
                  <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginBottom: '1.5rem', lineHeight: '1.4' }}>
                    {b.target_audience ? b.target_audience.substring(0,60) + "..." : "Sin configuración de audiencia..."}
                  </p>
                  <div style={{ display: 'flex', gap: '0.8rem' }}>
                    {(b.active_platforms || []).map((plat: string) => (
                        <span key={plat} style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.1)' }}>{plat}</span>
                    ))}
                  </div>
                </div>
            </Link>
          ))}

          <div onClick={() => setShowCreateModal(true)} className="glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '200px', border: '1px dashed rgba(255,255,255,0.1)', background: 'transparent', cursor: 'pointer', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
            <span style={{ fontSize: '2rem', color: '#6366f1', marginBottom: '1rem', textShadow: '0 0 10px rgba(99,102,241,0.5)' }}>+</span>
            <span style={{ fontWeight: 600, color: '#e2e8f0' }}>Crear nueva marca y diseñar ADN</span>
          </div>

        </div>
      </section>

      {/* Modal de Creación Full ADN */}
      {showCreateModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '2rem' }}>
              <div className="glass-card" style={{ width: '900px', maxWidth: '100%', maxHeight: '90vh', background: 'rgba(24,24,27,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '0', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                  
                  <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                      <h2 style={{ fontSize: '1.5rem', margin: 0, color: '#f8fafc' }}>🧬 Diseñar Nuevo ADN de Marca</h2>
                      <button onClick={closeModal} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
                  </div>

                  <div className="premium-scrollbar" style={{ padding: '2rem', overflowY: 'auto', flex: 1 }}>
                      <form id="create-brand-form" onSubmit={handleCreateBrand} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                              <div>
                                  <label style={labelStyle}>Nombre Comercial</label>
                                  <input value={name} onChange={e=>setName(e.target.value)} style={inputStyle} required />
                              </div>
                              <div>
                                  <label style={labelStyle}>Colores (HEX separados por comas)</label>
                                  <input value={colors} onChange={e=>setColors(e.target.value)} placeholder="#6366f1, #fff" style={inputStyle} />
                              </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                              <div>
                                  <label style={labelStyle}>Audiencia Objetivo / Target</label>
                                  <textarea value={audience} onChange={e=>setAudience(e.target.value)} style={{...inputStyle, height: '80px', resize: 'vertical'}} />
                              </div>
                              <div>
                                  <label style={labelStyle}>Tono de Voz</label>
                                  <textarea value={voice} onChange={e=>setVoice(e.target.value)} style={{...inputStyle, height: '80px', resize: 'vertical'}} />
                              </div>
                          </div>

                          <div>
                              <label style={labelStyle}>Productos y Promociones Activas</label>
                              <textarea value={products} onChange={e=>setProducts(e.target.value)} style={{...inputStyle, height: '80px', resize: 'vertical'}} />
                          </div>

                          <div style={{ padding: '1.5rem', background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '12px' }}>
                              <label style={{...labelStyle, color: '#38bdf8'}}>📰 Contexto de Actualidad (News Trend)</label>
                              <textarea value={newsTrend} onChange={e=>setNewsTrend(e.target.value)} placeholder="Ej: Nueva tendencia del 2024..." style={{...inputStyle, height: '80px', border: '1px solid rgba(56, 189, 248, 0.3)'}} />
                          </div>

                          <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                              <label style={{...labelStyle, color: '#2ecc71'}}>Prompt Maestro Definitivo</label>
                              <textarea value={masterPrompt} onChange={e=>setMasterPrompt(e.target.value)} placeholder="Instrucción central inquebrantable de la IA para esta marca." style={{...inputStyle, height: '100px', border: '1px solid rgba(46, 204, 113, 0.3)'}} />
                          </div>
                          
                          <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                              <label style={labelStyle}>Imágenes de Referencia (Base Visual)</label>
                              <input type="file" multiple accept="image/*" onChange={handleFileUpload} style={{ color: '#fff', marginBottom: '1rem', display: 'block' }} />
                              {referenceImages.length > 0 && (
                                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                                      {referenceImages.map((img, idx) => (
                                          <div key={idx} style={{ position: 'relative', width: '80px', height: '80px' }}>
                                              <img src={img} alt="ref" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)' }} />
                                              <button type="button" onClick={() => setReferenceImages(referenceImages.filter((_, i) => i !== idx))} style={{ position: 'absolute', top: -5, right: -5, background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', cursor: 'pointer', fontSize: '0.6rem' }}>X</button>
                                          </div>
                                      ))}
                                  </div>
                              )}
                          </div>

                          <div>
                              <label style={labelStyle}>Redes Sociales Aprobadas</label>
                              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                  {Object.keys(platforms).map(p => (
                                      <label key={p} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: (platforms as any)[p] ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.05)', padding: '10px 16px', borderRadius: '8px', border: (platforms as any)[p] ? '1px solid #6366f1' : '1px solid transparent' }}>
                                          <input type="checkbox" checked={(platforms as any)[p]} onChange={() => togglePlatform(p)} style={{ accentColor: '#6366f1' }} />
                                          <span style={{ color: (platforms as any)[p] ? '#fff' : '#a1a1aa', fontWeight: 600, fontSize: '0.9rem' }}>{p}</span>
                                      </label>
                                  ))}
                              </div>
                          </div>
                      </form>
                  </div>

                  <div style={{ padding: '1.5rem 2rem', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                      <button onClick={closeModal} style={{ padding: '12px 24px', background: 'transparent', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}>Cancelar</button>
                      <button form="create-brand-form" type="submit" disabled={saving} className="btn-primary" style={{ padding: '12px 32px', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', borderRadius: '8px', border: 'none', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                          {saving ? 'Codificando ADN...' : 'Dar vida a la Marca ✨'}
                      </button>
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
  );
}

const labelStyle = { display: 'block', marginBottom: '0.5rem', color: '#cbd5e1', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' as any, letterSpacing: '0.5px' };
const inputStyle = { width: '100%', boxSizing: 'border-box' as any, padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: '#f8fafc', fontFamily: 'inherit', fontSize: '0.95rem', outline: 'none' };
