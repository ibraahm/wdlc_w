'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { useState } from 'react';
import { updateProfileAction } from '@/lib/actions';
import type { AgentProfile } from '@/lib/api';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="auth-submit" style={{ width: 'auto', padding: '12px 28px' }}>
      {pending ? 'Saving…' : 'Save Listing'}
    </button>
  );
}

export default function ProfileClient({
  profile,
  status,
}: {
  profile: AgentProfile | null;
  status: string;
}) {
  const [state, action] = useFormState(updateProfileAction, null);
  const [showOnMap, setShowOnMap] = useState(profile?.showOnMap ?? false);

  const isActive = status === 'ACTIVE';
  const hasCoords = profile?.latitude != null && profile?.longitude != null;

  return (
    <div className="portal-content">
      <div className="dash-eyebrow">Agent Locator</div>
      <h1 className="dash-title">Your Public Listing</h1>

      <div className="dash-card">
        <p className="dash-card-title">Find an Agent map</p>
        <p style={{ fontSize: '0.84rem', color: 'var(--muted)', lineHeight: 1.6, marginTop: '8px' }}>
          Control how your location appears on the public{' '}
          <a href="/find-an-agent" style={{ color: 'var(--gold)' }}>Find an Agent</a> map. Your
          business name, address, and phone are shown publicly only when{' '}
          <strong>Show on map</strong> is on and your account is approved (ACTIVE). Your login email
          is never published.
        </p>

        {!isActive && (
          <div style={{ marginTop: '12px', padding: '12px 14px', borderLeft: '3px solid var(--gold)', background: 'rgba(200,150,12,0.06)', fontSize: '0.82rem', color: 'var(--charcoal)' }}>
            Your account is <strong>{status}</strong>. You can fill in your listing now, but it will
            only appear on the public map once an administrator approves your account.
          </div>
        )}

        {state?.error && <div className="auth-error" style={{ marginTop: '16px' }}>{state.error}</div>}
        {state?.ok && (
          <div className="auth-success" style={{ marginTop: '16px' }}>
            Listing saved.
            {state.geocoded === false && (
              <> We couldn’t locate that address on the map — please check the address fields; your pin won’t appear until it resolves.</>
            )}
          </div>
        )}

        <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginTop: '20px', maxWidth: '520px' }}>
          <div className="auth-field">
            <label htmlFor="businessName" className="auth-label">Business name</label>
            <input id="businessName" name="businessName" type="text" defaultValue={profile?.businessName ?? ''} className="auth-input" placeholder="e.g. Direct Link Money Center" />
          </div>
          <div className="auth-field">
            <label htmlFor="addressLine" className="auth-label">Street address</label>
            <input id="addressLine" name="addressLine" type="text" defaultValue={profile?.addressLine ?? ''} className="auth-input" placeholder="123 Main St, Suite 100" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
            <div className="auth-field">
              <label htmlFor="city" className="auth-label">City</label>
              <input id="city" name="city" type="text" defaultValue={profile?.city ?? ''} className="auth-input" />
            </div>
            <div className="auth-field">
              <label htmlFor="state" className="auth-label">State</label>
              <input id="state" name="state" type="text" defaultValue={profile?.state ?? ''} className="auth-input" placeholder="GA" />
            </div>
            <div className="auth-field">
              <label htmlFor="zip" className="auth-label">ZIP</label>
              <input id="zip" name="zip" type="text" defaultValue={profile?.zip ?? ''} className="auth-input" />
            </div>
          </div>
          <div className="auth-field">
            <label htmlFor="country" className="auth-label">Country</label>
            <input id="country" name="country" type="text" defaultValue={profile?.country ?? 'USA'} className="auth-input" />
          </div>
          <div className="auth-field">
            <label htmlFor="publicPhone" className="auth-label">Public phone</label>
            <input id="publicPhone" name="publicPhone" type="tel" defaultValue={profile?.publicPhone ?? ''} className="auth-input" placeholder="Shown to customers on the map" />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem', color: 'var(--charcoal)', cursor: 'pointer' }}>
            <input type="checkbox" name="showOnMap" checked={showOnMap} onChange={(e) => setShowOnMap(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: 'var(--gold)' }} />
            Show my location on the public Find an Agent map
          </label>

          {hasCoords && (
            <p style={{ fontSize: '0.76rem', color: 'var(--muted)' }}>
              Map coordinates resolved: {profile!.latitude!.toFixed(4)}, {profile!.longitude!.toFixed(4)}
            </p>
          )}

          <div><SubmitButton /></div>
          <p style={{ fontSize: '0.74rem', color: 'var(--muted)', lineHeight: 1.5 }}>
            We convert your address to a map pin automatically using OpenStreetMap. Saving with a
            changed address updates your pin.
          </p>
        </form>
      </div>
    </div>
  );
}
