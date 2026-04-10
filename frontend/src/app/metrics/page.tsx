"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import styles from "./page.module.css";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";

export default function MetricsDashboard() {
    const searchParams = useSearchParams();
    const brandId = searchParams.get('brandId');
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!brandId) return;

        const loadMetrics = async () => {
            try {
                const res = await apiFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/metrics/${brandId}/dashboard`);
                if (res.ok) {
                    const json = await res.json();
                    setData(json);
                }
            } catch (error) {
                console.error("Failed to fetch metrics", error);
            } finally {
                setLoading(false);
            }
        };

        loadMetrics();
    }, [brandId]);

    if (!brandId) {
        return <div className={styles.container}>Por favor selecciona una marca desde el Studio.</div>;
    }

    if (loading) {
        return <div className={styles.spinner}><h2>Recopilando Data Analítica...</h2></div>;
    }

    if (!data) {
        return <div className={styles.container}>Error al cargar métricas.</div>;
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Dashboard de Rendimiento</h1>
                <p>Monitoreo inteligente de alcance orgánico e impresiones publicitarias.</p>
            </div>

            <div className={styles.kpiGrid}>
                <div className={styles.kpiCard} style={{ borderTop: "4px solid #818cf8" }}>
                    <span className={styles.kpiLabel}>Total Spend (Ads)</span>
                    <span className={styles.kpiValue}>${data.kpis.total_spend_usd}</span>
                    <span className={styles.kpiTrend}>~ Inversión Activa</span>
                </div>
                <div className={styles.kpiCard} style={{ borderTop: "4px solid #34d399" }}>
                    <span className={styles.kpiLabel}>Avg CPC</span>
                    <span className={styles.kpiValue}>${data.kpis.avg_cpc}</span>
                    <span className={styles.kpiTrend}>~ Eficiencia de Clic</span>
                </div>
                <div className={styles.kpiCard} style={{ borderTop: "4px solid #fbbf24" }}>
                    <span className={styles.kpiLabel}>Impresiones Totales</span>
                    <span className={styles.kpiValue}>{(data.kpis.total_ad_impressions + data.kpis.total_organic_reach).toLocaleString()}</span>
                    <span className={styles.kpiTrend}>Alcance global</span>
                </div>
                <div className={styles.kpiCard} style={{ borderTop: "4px solid #f472b6" }}>
                    <span className={styles.kpiLabel}>Likes Orgánicos</span>
                    <span className={styles.kpiValue}>{data.kpis.total_organic_likes.toLocaleString()}</span>
                    <span className={styles.kpiTrend}>Comunidad Fiel</span>
                </div>
            </div>

            <div className={styles.chartSection}>
                <h2>Crecimiento de Alcance (Ads vs Orgánico)</h2>
                <ResponsiveContainer width="100%" height="90%">
                    <AreaChart data={data.chart_data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#818cf8" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorOrg" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#34d399" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="name" stroke="#6b7280" />
                        <YAxis stroke="#6b7280" />
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                        <Tooltip contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", color: "#fff", borderRadius: "10px" }} />
                        <Area type="monotone" dataKey="paid" name="Impresiones Ads" stroke="#818cf8" fillOpacity={1} fill="url(#colorPaid)" />
                        <Area type="monotone" dataKey="organic" name="Alcance Orgánico" stroke="#34d399" fillOpacity={1} fill="url(#colorOrg)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <div className={styles.tablesGrid}>
                <div className={styles.tableCard}>
                    <h3>🔥 Top Campañas Publicitarias</h3>
                    <div className={styles.dataList}>
                        {data.ads_top.length > 0 ? data.ads_top.map((ad: any) => (
                            <div key={ad.id} className={styles.dataRow}>
                                <div className={styles.dataMain}>
                                    <span className={styles.dataTitle}>{ad.name}</span>
                                    <span className={styles.dataSub}>Costo: ${ad.spend}</span>
                                </div>
                                <div className={styles.dataStats}>
                                    <div className={styles.statCol}>
                                        <span className={styles.statVal}>{ad.impressions.toLocaleString()}</span>
                                        <span className={styles.statLab}>Vistas</span>
                                    </div>
                                    <div className={styles.statCol}>
                                        <span className={styles.statVal}>{ad.clicks.toLocaleString()}</span>
                                        <span className={styles.statLab}>Clics</span>
                                    </div>
                                </div>
                            </div>
                        )) : <p style={{ color: "#9ca3af" }}>No hay campañas activas todavía.</p>}
                    </div>
                </div>

                <div className={styles.tableCard}>
                    <h3>💖 Top Posts Orgánicos</h3>
                    <div className={styles.dataList}>
                        {data.organic_top.length > 0 ? data.organic_top.map((post: any) => (
                            <div key={post.id} className={styles.dataRow}>
                                <div className={styles.dataMain}>
                                    <span className={styles.dataTitle}>{post.copy}</span>
                                </div>
                                <div className={styles.dataStats}>
                                    <div className={styles.statCol}>
                                        <span className={styles.statVal}>{post.likes.toLocaleString()}</span>
                                        <span className={styles.statLab}>Likes</span>
                                    </div>
                                    <div className={styles.statCol}>
                                        <span className={styles.statVal}>{post.reach.toLocaleString()}</span>
                                        <span className={styles.statLab}>Reach</span>
                                    </div>
                                </div>
                            </div>
                        )) : <p style={{ color: "#9ca3af" }}>No hay posteos orgánicos registrados.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}
