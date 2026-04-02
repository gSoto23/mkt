import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI Social Media Strategy",
  description: "Platform for strategy and automation of social media management using AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className} style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', margin: 0 }}>
        <div style={{ flex: 1 }}>
          {children}
        </div>
        <footer style={{ background: '#09090b', padding: '2rem', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '0.85rem', color: '#64748b' }}>
          <p style={{ marginBottom: '1rem' }}>&copy; {new Date().getFullYear()} Juguetes Sin Azúcar. All rights reserved.</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem' }}>
            <a href="/privacy" style={{ color: '#94a3b8', textDecoration: 'none' }}>Privacy Policy</a>
            <a href="/terms" style={{ color: '#94a3b8', textDecoration: 'none' }}>Terms of Service</a>
          </div>
        </footer>
      </body>
    </html>
  );
}
