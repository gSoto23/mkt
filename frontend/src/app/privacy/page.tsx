import React from 'react';
import Link from 'next/link';

export default function PrivacyPolicy() {
  return (
    <div style={{ padding: '4rem 2rem', maxWidth: '800px', margin: '0 auto', fontFamily: 'var(--font-inter)', color: '#e2e8f0', lineHeight: '1.6' }}>
      <Link href="/" style={{ color: '#818cf8', textDecoration: 'none', display: 'inline-block', marginBottom: '2rem', fontSize: '1rem', fontWeight: 600 }}>← Volver al inicio</Link>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem', color: '#fff' }}>Privacy Policy</h1>
      <p style={{ marginBottom: '1rem', color: '#94a3b8' }}>Last Updated: {new Date().toLocaleDateString()}</p>
      
      <p style={{ marginBottom: '1.5rem' }}>
        Welcome to Juguetes Sin Azúcar. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our dashboard and use our automation system.
      </p>

      <h2 style={{ fontSize: '1.5rem', marginTop: '2.5rem', marginBottom: '1rem', color: '#fff' }}>1. Information We Collect</h2>
      <p style={{ marginBottom: '1.5rem' }}>
        We may collect information about you in a variety of ways. When you connect your social media accounts (such as Meta or TikTok), we authenticate your account using OAuth. The only information we extract and store from the OAuth providers is your public identifiers (e.g., Application Scoped User ID or OpenID) and OAuth Tokens necessary to publish content on your behalf.
      </p>

      <h2 style={{ fontSize: '1.5rem', marginTop: '2.5rem', marginBottom: '1rem', color: '#fff' }}>2. Use of Your Information</h2>
      <p style={{ marginBottom: '1.5rem' }}>
        Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we use information collected via our platform to:
        <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', listStyleType: 'disc' }}>
          <li>Publish AI-generated posts and videos explicitly approved by you to your connected social channels (Facebook, Instagram, TikTok).</li>
          <li>Monitor the status and success rate of your scheduled publications.</li>
          <li>Compile anonymous statistical data and analysis for use internally.</li>
        </ul>
      </p>

      <h2 style={{ fontSize: '1.5rem', marginTop: '2.5rem', marginBottom: '1rem', color: '#fff' }}>3. Data Regarding Third-Party Integration</h2>
      <p style={{ marginBottom: '1.5rem' }}>
        Our software integrates with Meta APIs and TikTok APIs. We adhere strictly to the Platform Terms from these providers. Your Access Tokens are securely stored in our backend databases and are never sold or shared with any unassociated third parties. You can revoke access at any time through the official Meta Business Manager or TikTok App Settings.
      </p>

      <h2 style={{ fontSize: '1.5rem', marginTop: '2.5rem', marginBottom: '1rem', color: '#fff' }}>4. Data Security</h2>
      <p style={{ marginBottom: '1.5rem' }}>
        We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable.
      </p>

      <h2 style={{ fontSize: '1.5rem', marginTop: '2.5rem', marginBottom: '1rem', color: '#fff' }}>5. Contact Us</h2>
      <p style={{ marginBottom: '1.5rem' }}>
        If you have questions or comments about this Privacy Policy, please contact us at contact@juguetessinazucar.com.
      </p>
    </div>
  );
}
