'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

export default function BrandSettings() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const brandIdStr = searchParams.get('brandId') || '1';
    const brandId = parseInt(brandIdStr, 10);
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Form state
    const [name, setName] = useState('');
    const [audience, setAudience] = useState('');
    const [voice, setVoice] = useState('');
    const [products, setProducts] = useState('');
    const [masterPrompt, setMasterPrompt] = useState('');
    const [newsTrend, setNewsTrend] = useState('');
    
    // UI State for platforms, colors, images
    const [platforms, setPlatforms] = useState({ Facebook: false, Instagram: false, TikTok: false });
    const [colors, setColors] = useState('');
    const [referenceImages, setReferenceImages] = useState<string[]>([]);

    useEffect(() => {
        const loadBrand = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/brands/${brandId}`);
                if (!res.ok) throw new Error('Marca no encontrada');
                const data = await res.json();
                
                setName(data.name || '');
                setAudience(data.target_audience || '');
                setVoice(data.brand_voice_prompt || '');
                setProducts(data.products_promotions || '');
                setMasterPrompt(data.master_prompt || '');
                setNewsTrend(data.news_trend || '');
                
                if (data.reference_images) setReferenceImages(data.reference_images);
                
                // Parse platforms array to checkboxes map
                const activeMap: any = { Facebook: false, Instagram: false, TikTok: false };
                if (data.active_platforms && Array.isArray(data.active_platforms)) {
                    data.active_platforms.forEach((p: string) => activeMap[p] = true);
                }
                setPlatforms(activeMap);
                
                if (data.visual_identity && data.visual_identity.colors) {
                    setColors(data.visual_identity.colors.join(', '));
                }
            } catch (e) {
                console.error(e);
                router.push('/');
            }
            setLoading(false);
        };
        loadBrand();
    }, [brandId, router]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        
        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                if(event.target?.result) {
                    setReferenceImages(prev => [...prev, event.target!.result as string]);
                }
            };
            reader.readAsDataURL(file);
        });
    };

    const handleSave = async (e: React.FormEvent) => {
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
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/brands/${brandId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            router.push(`/studio?brandId=${brandId}`);
        } catch (e) {
            console.error(e);
        }
        setSaving(false);
    };

    const togglePlatform = (p: string) => setPlatforms({...platforms, [p]: !(platforms as any)[p]});

    if (loading) return <div style={{padding:'4rem', textAlign:'center', color:'#fff'}}>Cargando ADN...</div>;

    return (
        <main style={{ padding: '3rem 2rem', maxWidth: '900px', margin: '0 auto', fontFamily: 'var(--font-inter)', boxSizing: 'border-box' }}>
            
            <div style={{ marginBottom: '2rem' }}>
                <Link href={`/studio?brandId=${brandId}`} style={{ color: '#a1a1aa', textDecoration: 'none', fontSize: '0.9rem' }}>← Volver al Calendario</Link>
                <h1 className="hero-title" style={{ fontSize: '2.5rem', marginTop: '1rem', marginBottom: '0.5rem' }}>Configuración de Marca (ADN)</h1>
                <p style={{ color: '#a1a1aa' }}>Ajusta el núcleo lógico que la Inteligencia Artificial usará para generar tu contenido.</p>
            </div>

            <form onSubmit={handleSave} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '2rem', boxSizing: 'border-box' }}>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                    <div>
                        <label style={labelStyle}>Nombre Comercial</label>
                        <input value={name} onChange={e=>setName(e.target.value)} style={inputStyle} required />
                    </div>
                    <div>
                        <label style={labelStyle}>Colores de Marca (HEX separados por comas)</label>
                        <input value={colors} onChange={e=>setColors(e.target.value)} placeholder="#2ecc71, #fff" style={inputStyle} />
                    </div>
                </div>

                <div>
                    <label style={labelStyle}>Audiencia Objetivo / Target</label>
                    <textarea value={audience} onChange={e=>setAudience(e.target.value)} style={{...inputStyle, height: '80px', resize: 'vertical'}} />
                </div>

                <div>
                    <label style={labelStyle}>Tono de Voz</label>
                    <textarea value={voice} onChange={e=>setVoice(e.target.value)} placeholder="Ej: Profesional, divertido, de ventas..." style={{...inputStyle, height: '80px', resize: 'vertical'}} />
                </div>

                <div>
                    <label style={labelStyle}>Productos y Promociones Activas</label>
                    <textarea value={products} onChange={e=>setProducts(e.target.value)} style={{...inputStyle, height: '80px', resize: 'vertical'}} />
                </div>

                {/* --- NUEVA SECCIÓN DE NOTICIAS --- */}
                <div style={{ padding: '1.5rem', background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '12px' }}>
                    <label style={{...labelStyle, color: '#38bdf8'}}>📰 Contexto de Actualidad (News Trend)</label>
                    <p style={{fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '1rem'}}>
                        Proporciona noticias recientes, coyuntura o eventos próximos para que la IA ancle sus publicaciones al mundo real (Newsjacking).
                    </p>
                    <textarea 
                        value={newsTrend} 
                        onChange={e=>setNewsTrend(e.target.value)} 
                        placeholder="Ej: La ONU acaba de lanzar la campaña #PlantaUnArbol2024. Quiero que los posts mencionen cómo nos sumamos a esta meta global." 
                        style={{...inputStyle, height: '80px', resize: 'vertical', border: '1px solid rgba(56, 189, 248, 0.3)'}} 
                    />
                </div>

                <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                    <label style={{...labelStyle, color: '#2ecc71'}}>Prompt Maestro (Comportamiento Base de la IA)</label>
                    <p style={{fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '1rem'}}>Esta es la orden irrevocable que guiará a la IA sobre cómo debe pensar toda su estrategia semanal para este cliente en específico.</p>
                    <textarea 
                        value={masterPrompt} 
                        onChange={e=>setMasterPrompt(e.target.value)} 
                        placeholder="Ej: Eres un ambientalista estricto. Todos tus posts deben incluir referencias bibliográficas de botánica." 
                        style={{...inputStyle, height: '120px', resize: 'vertical', border: '1px solid rgba(46, 204, 113, 0.3)'}} 
                    />
                </div>
                
                {/* --- NUEVA SECCIÓN DE IMÁGENES DE REFERENCIA --- */}
                <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                    <label style={labelStyle}>Imágenes de Referencia (Base Visual para Nano Banana 2)</label>
                    <p style={{fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '1rem'}}>Sube logos, empaques de productos o moodboards para que la generación de imágenes respete la estética corporativa de la marca.</p>
                    
                    <input type="file" multiple accept="image/*" onChange={handleFileUpload} style={{ color: '#fff', marginBottom: '1rem', display: 'block' }} />
                    
                    {referenceImages.length > 0 && (
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                            {referenceImages.map((img, idx) => (
                                <div key={idx} style={{ position: 'relative', width: '100px', height: '100px' }}>
                                    <img src={img} alt="ref" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)' }} />
                                    <button 
                                        type="button"
                                        onClick={() => setReferenceImages(referenceImages.filter((_, i) => i !== idx))}
                                        style={{ position: 'absolute', top: -5, right: -5, background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '0.7rem' }}
                                    >X</button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div>
                    <label style={labelStyle}>Redes Sociales Aprobadas</label>
                    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                        {Object.keys(platforms).map(p => (
                            <label key={p} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', background: (platforms as any)[p] ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.05)', padding: '12px 20px', borderRadius: '8px', border: (platforms as any)[p] ? '1px solid #6366f1' : '1px solid transparent' }}>
                                <input type="checkbox" checked={(platforms as any)[p]} onChange={() => togglePlatform(p)} style={{ accentColor: '#6366f1', transform: 'scale(1.2)' }} />
                                <span style={{ color: (platforms as any)[p] ? '#fff' : '#a1a1aa', fontWeight: 600 }}>{p}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <button type="submit" disabled={saving} className="btn-primary" style={{ padding: '16px', background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', marginTop: '1rem', fontSize: '1.1rem' }}>
                    {saving ? 'Guardando ADN...' : 'Guardar ADN de Marca'}
                </button>

            </form>
        </main>
    )
}

const labelStyle = { display: 'block', marginBottom: '0.5rem', color: '#e4e4e7', fontSize: '0.9rem', fontWeight: 600 };
const inputStyle = { width: '100%', boxSizing: 'border-box' as any, padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.3)', color: 'white', fontFamily: 'inherit', fontSize: '0.95rem' };
