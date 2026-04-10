'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import styles from './page.module.css';

function AdsDashboardContent() {
    const searchParams = useSearchParams();
    const boostPostId = searchParams.get('boostPostId');

    const [budget, setBudget] = useState('1000'); // in cents
    const [campaignType, setCampaignType] = useState(boostPostId ? 'BOOST' : 'DARK_POST');
    const [name, setName] = useState('');
    const [adAccounts, setAdAccounts] = useState<any[]>([]);
    const [selectedAccount, setSelectedAccount] = useState('');
    
    // Simulating loading ad accounts from API
    useEffect(() => {
        // In a real scenario, fetch from /api/ads/accounts
        setAdAccounts([
            { id: 1, name: 'Darboles Meta Ads', platform: 'facebook' }
        ]);
        setSelectedAccount('1');
    }, []);

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        try {
            const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/ads/create`, {
                method: 'POST',
                body: JSON.stringify({
                    post_id: boostPostId ? parseInt(boostPostId) : null,
                    ad_account_id: parseInt(selectedAccount),
                    name: name || `Campaign ${new Date().getTime()}`,
                    campaign_type: campaignType,
                    budget_daily: parseInt(budget),
                    target_audience: { "country": "CR", "age_min": 18, "age_max": 65 }
                })
            });
            
            if (res.ok) {
                alert('Campaña creada. Está siendo procesada hacia Meta Ads.');
                window.location.href = '/calendar';
            } else {
                alert('Error al crear campaña.');
            }
        } catch(err) {
            console.error(err);
            alert('Error interno.');
        }
    };

    return (
        <main className={styles.container}>
            <div className={styles.header}>
                <Link href="/calendar" className={styles.backLink}>← Volver al Calendario</Link>
                <h1 className={styles.title}>Marketing Ads Studio</h1>
            </div>

            <div className={styles.card}>
                <h2 style={{marginTop: 0, marginBottom: '2.5rem', fontWeight: 700, fontSize: '1.8rem'}}>
                    {boostPostId ? `Promociona tu Post #${boostPostId} 🚀` : 'Crear Nueva Campaña (Dark Post)'}
                </h2>
                
                <form onSubmit={handleSubmit}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Cuenta Publicitaria (Ad Account)</label>
                        <div className={styles.inputWrapper}>
                            <select 
                                className={styles.input} 
                                value={selectedAccount} 
                                onChange={(e) => setSelectedAccount(e.target.value)}
                            >
                                {adAccounts.map(acc => (
                                    <option key={acc.id} value={acc.id} style={{color: '#000'}}>
                                        {acc.name} ({acc.platform})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Nombre de la Campaña</label>
                        <div className={styles.inputWrapper}>
                            <input 
                                type="text" 
                                className={styles.input} 
                                value={name} 
                                onChange={(e) => setName(e.target.value)} 
                                placeholder="Ej: Promo Verano 2026"
                                required
                            />
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>Presupuesto Diario (USD)</label>
                        <div className={styles.inputWrapper}>
                            <span className={styles.currencySymbol}>$</span>
                            <input 
                                type="number" 
                                className={`${styles.input} ${styles.budgetInput}`} 
                                value={parseInt(budget) / 100} 
                                onChange={(e) => setBudget((parseFloat(e.target.value) * 100).toString())} 
                                min="1"
                                step="1"
                            />
                        </div>
                        <small className={styles.helperText}>
                            <span style={{color: '#818cf8'}}>✦</span> El cobro se procesará automáticamente usando la tarjeta de crédito conectada a tu Meta Business Manager.
                        </small>
                    </div>

                    <button type="submit" className={styles.submitBtn}>
                        Lanzar Campaña
                    </button>
                </form>
            </div>
        </main>
    );
}

export default function AdsDashboard() {
    return (
        <Suspense fallback={<div>Loading Ads...</div>}>
            <AdsDashboardContent />
        </Suspense>
    );
}
