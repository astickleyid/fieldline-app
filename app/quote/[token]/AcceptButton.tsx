'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AcceptButton({ leadId }: { leadId: string }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();

  async function accept() {
    setLoading(true);
    const res = await fetch(`/api/leads/${leadId}/accept`, { method: 'PUT' });
    if (res.ok) {
      setDone(true);
      setTimeout(() => router.refresh(), 800);
    } else {
      setLoading(false);
    }
  }

  if (done) return (
    <div className="text-center py-3 text-acid font-mono tracking-wider">✓ ACCEPTED — refreshing...</div>
  );

  return (
    <button
      onClick={accept}
      disabled={loading}
      className="w-full py-4 bg-acid hover:bg-acid/80 text-ink rounded-lg text-base font-semibold transition-all disabled:opacity-50">
      {loading ? 'Processing...' : 'Accept Quote →'}
    </button>
  );
}
