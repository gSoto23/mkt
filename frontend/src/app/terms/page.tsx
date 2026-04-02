import React from 'react';

export default function TermsOfService() {
  return (
    <div style={{ padding: '4rem 2rem', maxWidth: '800px', margin: '0 auto', fontFamily: 'var(--font-inter)', color: '#e2e8f0', lineHeight: '1.6' }}>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem', color: '#fff' }}>Terms of Service</h1>
      <p style={{ marginBottom: '1rem', color: '#94a3b8' }}>Last Updated: {new Date().toLocaleDateString()}</p>

      <p style={{ marginBottom: '1.5rem' }}>
        Welcome to Juguetes Sin Azúcar. By accessing or using our websites, applications, and services, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, then you may not access our services.
      </p>

      <h2 style={{ fontSize: '1.5rem', marginTop: '2.5rem', marginBottom: '1rem', color: '#fff' }}>1. Service Description</h2>
      <p style={{ marginBottom: '1.5rem' }}>
        Juguetes Sin Azúcar provides a Dashboard for marketing automation. We utilize Artificial Intelligence to generate marketing copy, images, and videos. Furthermore, we provide you the capability to connect your third-party social media accounts to schedule and automate content publication.
      </p>

      <h2 style={{ fontSize: '1.5rem', marginTop: '2.5rem', marginBottom: '1rem', color: '#fff' }}>2. Use of Third-Party Integrations</h2>
      <p style={{ marginBottom: '1.5rem' }}>
        Our Service integrates seamlessly with third-party networks, including but not limited to Meta (Facebook, Instagram) and TikTok. By choosing to link these accounts, you authorize our platform to interact with the Respective APIs on your behalf, abiding by their specific Community Guidelines and Terms of Use. You are solely responsible for the content that is published through our engine to your accounts.
      </p>

      <h2 style={{ fontSize: '1.5rem', marginTop: '2.5rem', marginBottom: '1rem', color: '#fff' }}>3. User Responsibilities</h2>
      <p style={{ marginBottom: '1.5rem' }}>
        You agree that you will not use our AI functionality to generate material that is illegal, defamatory, highly abusive, or violating any copyright laws. While our Service automates publication, you explicitly approve content before it is dispatched to social platform platforms.
      </p>

      <h2 style={{ fontSize: '1.5rem', marginTop: '2.5rem', marginBottom: '1rem', color: '#fff' }}>4. Limitation of Liability</h2>
      <p style={{ marginBottom: '1.5rem' }}>
        In no event shall Juguetes Sin Azúcar, nor its directors, employees, partners, or agents, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.
      </p>

      <h2 style={{ fontSize: '1.5rem', marginTop: '2.5rem', marginBottom: '1rem', color: '#fff' }}>5. Contact Us</h2>
      <p style={{ marginBottom: '1.5rem' }}>
        If you have any questions regarding these terms, please contact us at contact@juguetessinazucar.com.
      </p>
    </div>
  );
}
