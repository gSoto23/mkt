'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const formData = new URLSearchParams();
            formData.append('username', email);
            formData.append('password', password);

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData.toString()
            });

            if (res.ok) {
                const data = await res.json();
                localStorage.setItem('token', data.access_token);
                router.push('/');
            } else {
                setError('Credenciales incorrectas o servidor inactivo.');
            }
        } catch (err) {
            setError('Error de conexión con el sistema matriz.');
        }
        setLoading(false);
    };

    return (
        <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at center, #1a1a2e 0%, #0f0f1a 100%)', fontFamily: 'var(--font-inter)', padding: '2rem' }}>
            <div className="glass-card" style={{ width: '400px', maxWidth: '100%', padding: '3rem 2rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem', filter: 'drop-shadow(0 0 10px rgba(99,102,241,0.5))' }}>🔐</div>
                <h1 style={{ fontSize: '1.8rem', color: '#fff', marginBottom: '0.5rem', fontWeight: 700, letterSpacing: '-0.5px' }}>Acceso Restringido</h1>
                <p style={{ color: '#a1a1aa', fontSize: '0.9rem', marginBottom: '2.5rem', textAlign: 'center' }}>Portal Privado de G-MKT AI</p>

                {error && <div style={{ width: '100%', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', padding: '12px', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.85rem', textAlign: 'center', fontWeight: 600 }}>{error}</div>}

                <form onSubmit={handleLogin} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', color: '#a1a1aa', fontSize: '0.85rem', marginBottom: '8px', fontWeight: 600 }}>Correo Electrónico / Identity</label>
                        <input 
                            type="text" 
                            value={email} 
                            onChange={e => setEmail(e.target.value)} 
                            placeholder="eddyngerardo@gmail.com"
                            required
                            style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '14px', borderRadius: '8px', fontSize: '1rem', outline: 'none', transition: 'border 0.2s' }}
                            onFocus={e => e.target.style.borderColor = '#6366f1'}
                            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                        />
                    </div>
                    
                    <div>
                        <label style={{ display: 'block', color: '#a1a1aa', fontSize: '0.85rem', marginBottom: '8px', fontWeight: 600 }}>Llave Criptográfica</label>
                        <input 
                            type="password" 
                            value={password} 
                            onChange={e => setPassword(e.target.value)} 
                            placeholder="••••••••"
                            required
                            style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '14px', borderRadius: '8px', fontSize: '1rem', outline: 'none', transition: 'border 0.2s' }}
                            onFocus={e => e.target.style.borderColor = '#6366f1'}
                            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        style={{ width: '100%', boxSizing: 'border-box', background: loading ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: loading ? '#fff' : '#fff', border: 'none', padding: '16px', borderRadius: '8px', fontSize: '1.05rem', fontWeight: 600, marginTop: '1rem', cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 10px 25px rgba(99,102,241,0.3)', transition: 'all 0.3s' }}
                    >
                        {loading ? 'Descifrando...' : 'Ingresar al Portal'}
                    </button>
                </form>
            </div>
        </main>
    );
}
