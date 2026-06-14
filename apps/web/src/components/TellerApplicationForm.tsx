'use client';

import { useState, type FormEvent } from 'react';
import { HumanVerificationField, useHumanVerification } from './HumanVerification';

const inputCls =
  'w-full rounded-lg border border-[#d9e0e8] bg-white px-3 py-2 text-ink focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none';

const CONSENT_TEXT =
  'I certify the information provided is true and complete, and I consent to a background check as part of the teller credentialing process. Typing my name below is my electronic signature.';

export default function TellerApplicationForm() {
  const [values, setValues] = useState({
    branchCode: '', firstName: '', lastName: '', email: '', phone: '',
    addressLine: '', city: '', state: '', zip: '', signatureName: '',
  });
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const hv = useHumanVerification('teller_application', true);

  const set = (k: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!/^[a-z0-9]{6}$/.test(values.branchCode.trim().toLowerCase()))
      return setError('Branch code must be 6 letters/digits (e.g. uswdlc) - ask your agent principal.');
    if (!values.firstName || !values.lastName || !values.email || !values.phone)
      return setError('Please complete all required fields.');
    if (!consent || !values.signatureName.trim())
      return setError('Please sign and consent to the background check.');
    if (!hv.challenge || !hv.answer.trim())
      return setError('Please answer the verification question.');

    setError('');
    setPending(true);
    try {
      const res = await fetch('/api/teller-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values,
          branchCode: values.branchCode.trim().toLowerCase(),
          signatureConsent: true,
          humanVerificationToken: hv.challenge?.token,
          humanVerificationAnswer: hv.answer.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 403 || String(data.error).toLowerCase().includes('security')) void hv.refresh();
        setError(data.error || 'Submission failed. Please try again.');
        return;
      }
      setDone(true);
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-6 text-green-800">
        <p className="font-medium">
          Thank you - your teller application has been received. Our compliance team will run the
          required checks and you will receive your portal access by email once approved.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-bold text-primary-strong mb-1">Branch code *</label>
        <input value={values.branchCode} onChange={set('branchCode')} maxLength={6} placeholder="e.g. uswdlc" className={inputCls} />
        <p className="text-xs text-muted mt-1">The 6-character code of the agent branch you work for. If unsure, ask your principal - compliance can correct it during review.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><label className="block text-sm font-bold text-primary-strong mb-1">First name *</label><input value={values.firstName} onChange={set('firstName')} className={inputCls} /></div>
        <div><label className="block text-sm font-bold text-primary-strong mb-1">Last name *</label><input value={values.lastName} onChange={set('lastName')} className={inputCls} /></div>
        <div><label className="block text-sm font-bold text-primary-strong mb-1">Email *</label><input type="email" value={values.email} onChange={set('email')} className={inputCls} /></div>
        <div><label className="block text-sm font-bold text-primary-strong mb-1">Phone *</label><input type="tel" value={values.phone} onChange={set('phone')} className={inputCls} /></div>
      </div>
      <div><label className="block text-sm font-bold text-primary-strong mb-1">Street address</label><input value={values.addressLine} onChange={set('addressLine')} className={inputCls} /></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div><label className="block text-sm font-bold text-primary-strong mb-1">City</label><input value={values.city} onChange={set('city')} className={inputCls} /></div>
        <div><label className="block text-sm font-bold text-primary-strong mb-1">State</label><input value={values.state} onChange={set('state')} className={inputCls} /></div>
        <div><label className="block text-sm font-bold text-primary-strong mb-1">ZIP</label><input value={values.zip} onChange={set('zip')} className={inputCls} /></div>
      </div>

      <div className="rounded-lg border border-[#d9e0e8] bg-[#f8fafc] p-4 space-y-3">
        <p className="text-sm text-ink/80">{CONSENT_TEXT}</p>
        <div><label className="block text-sm font-bold text-primary-strong mb-1">Type your full legal name (signature) *</label>
          <input value={values.signatureName} onChange={set('signatureName')} className={inputCls} /></div>
        <label className="flex items-start gap-2 text-sm text-ink/80 cursor-pointer">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
          I agree and consent to the background check. *
        </label>
      </div>

      <HumanVerificationField
        answer={hv.answer}
        challenge={hv.challenge}
        error={hv.error}
        loading={hv.loading}
        onAnswerChange={hv.setAnswer}
        onRefresh={() => void hv.refresh()}
      />

      {error && <p className="text-sm text-[#a73535] font-medium">{error}</p>}
      <button type="submit" disabled={pending}
        className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-primary text-white font-bold hover:bg-primary-strong transition-colors disabled:opacity-60">
        {pending ? 'Submitting…' : 'Submit Application'}
      </button>
    </form>
  );
}
