import React from 'react';

const POLICY_VERSION = '2026-04-14';

function PolicyPage({ type = 'privacy' }) {
  const isTerms = type === 'terms';

  return (
    <div className="policy-page-shell">
      <div className="policy-page-card">
        <div className="policy-page-header">
          <h1>{isTerms ? 'Felcin Terms of Use' : 'Felcin Privacy Policy'}</h1>
          <p>Last updated: April 14, 2026</p>
          <div className="policy-inline-links policy-inline-links-left">
            <a href="/terms">Terms</a>
            <span>•</span>
            <a href="/privacy">Privacy</a>
          </div>
        </div>

        {isTerms ? (
          <div className="policy-page-content">
            <h2>Eligibility</h2>
            <p>You must be at least 16 years old to create and use a Felcin account.</p>

            <h2>Acceptable Use</h2>
            <p>You agree not to post illegal, abusive, harmful, sexually exploitative, or infringing content.</p>
            <p>You are responsible for the accuracy and legality of content uploaded from your account.</p>

            <h2>Moderation and Enforcement</h2>
            <p>Felcin may remove content, limit features, or suspend accounts for policy or safety violations.</p>

            <h2>Account Security</h2>
            <p>You are responsible for maintaining the confidentiality of your account credentials.</p>

            <h2>Policy Updates</h2>
            <p>We may update these terms over time. Continued use after updates means you accept the revised terms.</p>
          </div>
        ) : (
          <div className="policy-page-content">
            <h2>Data We Collect</h2>
            <p>We collect account information (such as email), profile information, and content you upload.</p>

            <h2>How Data Is Used</h2>
            <p>Data is used to provide core app functions, social interactions, moderation, and account security.</p>

            <h2>Service Providers</h2>
            <p>Felcin uses Firebase for authentication, database, and storage operations.</p>

            <h2>Moderation Logs</h2>
            <p>Admin moderation actions may be logged for abuse prevention, platform safety, and auditing.</p>

            <h2>Your Choices</h2>
            <p>You can request updates to your profile information or account deletion by contacting support.</p>
          </div>
        )}

        <div className="policy-page-footer">
          <p>Policy version: {POLICY_VERSION}</p>
          <a className="primary-btn" href="/">Back to Felcin</a>
        </div>
      </div>
    </div>
  );
}

export default PolicyPage;
