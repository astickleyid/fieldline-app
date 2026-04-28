'use client';

import { useEffect, useState } from 'react';
import TopBar from '@/components/TopBar';
import { useShell } from '@/components/AppShell';

type Template = {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: 'quote' | 'follow-up' | 'invoice' | 'thank-you' | 'general';
  createdAt: number;
};

const MERGE_TAGS = [
  { tag: '{{customer_name}}', desc: "Customer's name" },
  { tag: '{{business_name}}', desc: 'Your business name' },
  { tag: '{{quote_amount}}', desc: 'Quote total' },
  { tag: '{{address}}', desc: 'Property address' },
  { tag: '{{date}}', desc: "Today's date" },
  { tag: '{{phone}}', desc: 'Your phone' },
];

const PRESETS: Omit<Template, 'id' | 'createdAt'>[] = [
  {
    name: 'Quote sent',
    subject: 'Your quote from {{business_name}}',
    body: `Hi {{customer_name}},\n\nThanks for reaching out. I've put together a quote for {{address}}:\n\nTotal: {{quote_amount}}\n\nLet me know if you'd like to move forward — happy to answer any questions.\n\n— {{business_name}}`,
    category: 'quote',
  },
  {
    name: '3-day follow-up',
    subject: 'Just checking in',
    body: `Hi {{customer_name}},\n\nWanted to follow up on the quote I sent over a few days ago. Any questions I can answer?\n\nIf the timing isn't right, no worries — just let me know either way.\n\n— {{business_name}}`,
    category: 'follow-up',
  },
  {
    name: 'Invoice sent',
    subject: 'Invoice from {{business_name}}',
    body: `Hi {{customer_name}},\n\nAttached is your invoice for the work we completed. Total: {{quote_amount}}\n\nThank you for your business.\n\n— {{business_name}}`,
    category: 'invoice',
  },
  {
    name: 'Thank you / review request',
    subject: 'Thanks for choosing {{business_name}}',
    body: `Hi {{customer_name}},\n\nThanks again for the work today — it was a pleasure. If you have a minute, a quick Google review would mean a lot.\n\nAnd if anything wasn't perfect, please tell me first so I can make it right.\n\n— {{business_name}}`,
    category: 'thank-you',
  },
];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Template | null>(null);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const { openSidebar } = useShell();

  useEffect(() => {
    load();
    const onFocus = () => load();
    const onVis = () => { if (document.visibilityState === 'visible') load(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);
  async function load() {
    const res = await fetch('/api/templates');
    const data = await res.json();
    setTemplates(data.templates || []);
    setLoading(false);
  }

  async function seedPresets() {
    if (!confirm('Add 4 starter templates? You can edit or delete them after.')) return;
    for (const p of PRESETS) {
      await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p),
      });
    }
    load();
  }

  async function remove(id: string) {
    if (!confirm('Delete this template?')) return;
    await fetch(`/api/templates/${id}`, { method: 'DELETE' });
    load();
  }

  const filtered = filter === 'all' ? templates : templates.filter((t) => t.category === filter);

  return (
    <div>
      <TopBar
        title="Templates"
        subtitle={`${templates.length} TEMPLATES · MERGE TAGS SUPPORTED`}
        onMenuClick={openSidebar}
        action={
          <div className="flex gap-2">
            {templates.length === 0 && (
              <button onClick={seedPresets} className="px-3 py-1.5 border border-rule text-paper-mute hover:text-paper rounded-md text-xs">
                Add starters
              </button>
            )}
            <button onClick={() => setCreating(true)} className="px-3 py-1.5 bg-signal hover:bg-signal-bright text-white rounded-md text-xs font-medium">+ New</button>
          </div>
        }
      />

      <div className="border-b border-rule px-4 md:px-6 h-12 flex items-center gap-1 bg-ink/40 overflow-x-auto">
        {['all', 'quote', 'follow-up', 'invoice', 'thank-you', 'general'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded font-mono text-[10px] tracking-wider uppercase whitespace-nowrap ${
              filter === f ? 'bg-paper text-ink' : 'text-paper-mute hover:text-paper'
            }`}>
            {f}
          </button>
        ))}
      </div>

      <div className="p-4 md:p-6 max-w-3xl">
        <div className="mb-4 bg-ink-2 border border-rule rounded-lg p-4">
          <div className="font-mono text-[10px] text-paper-mute tracking-wider uppercase mb-2">Available Merge Tags</div>
          <div className="flex flex-wrap gap-1.5">
            {MERGE_TAGS.map((m) => (
              <span key={m.tag} className="font-mono text-[10px] px-2 py-1 bg-ink border border-rule rounded" title={m.desc}>
                <span className="text-signal">{m.tag}</span>
              </span>
            ))}
          </div>
          <div className="text-[11px] text-paper-mute mt-2">When you use a template, these get replaced with real values for that lead/customer.</div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-paper-mute font-mono text-xs">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-ink-2 border border-dashed border-rule rounded-lg">
            <div className="text-paper-mute mb-2">No templates yet</div>
            <div className="text-xs text-paper-dim mb-4">Save the messages you send most often, with merge tags for personalization.</div>
            <button onClick={seedPresets} className="px-4 py-2 bg-signal hover:bg-signal-bright text-white rounded-md text-xs font-medium">
              + Add 4 starter templates
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((t) => (
              <div key={t.id} className="bg-ink-2 border border-rule rounded-lg p-4">
                <div className="flex justify-between items-start gap-3 mb-2">
                  <div>
                    <div className="text-base font-medium text-paper">{t.name}</div>
                    <div className="font-mono text-[10px] text-paper-mute tracking-wider uppercase">{t.category}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setEditing(t)} className="text-[11px] text-paper-mute hover:text-paper">Edit</button>
                    <button onClick={() => navigator.clipboard.writeText(t.body)} className="text-[11px] text-paper-mute hover:text-paper">Copy</button>
                    <button onClick={() => remove(t.id)} className="text-[11px] text-paper-mute hover:text-red-400">Delete</button>
                  </div>
                </div>
                {t.subject && <div className="text-[12px] text-paper-mute mb-2">Subject: <span className="text-paper">{t.subject}</span></div>}
                <div className="bg-ink border border-rule rounded p-3 text-[12px] text-paper whitespace-pre-wrap font-mono">{t.body}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {(creating || editing) && (
        <TemplateModal
          template={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { load(); setCreating(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

function TemplateModal({ template, onClose, onSaved }: { template: Template | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(template?.name || '');
  const [subject, setSubject] = useState(template?.subject || '');
  const [body, setBody] = useState(template?.body || '');
  const [category, setCategory] = useState<Template['category']>(template?.category || 'general');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    if (template) {
      await fetch(`/api/templates/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, subject, body, category }),
      });
    } else {
      await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, subject, body, category }),
      });
    }
    setSaving(false);
    onSaved();
  }

  function insertTag(tag: string, target: 'subject' | 'body') {
    if (target === 'subject') setSubject(subject + tag);
    else setBody(body + tag);
  }

  return (
    <div className="fixed inset-0 bg-ink/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-ink-2 border border-rule rounded-xl w-full max-w-2xl my-8 fade-up">
        <div className="px-5 py-3 border-b border-rule flex justify-between items-center">
          <div className="font-mono text-[10px] text-paper-mute tracking-wider uppercase">{template ? 'Edit Template' : 'New Template'}</div>
          <button onClick={onClose} className="text-paper-mute hover:text-paper text-xl">×</button>
        </div>
        <div className="p-5 space-y-4">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name" className="w-full bg-ink border border-rule rounded-md px-3 py-2 text-paper text-sm placeholder-paper-dim outline-none focus:border-signal/40"/>
          <div>
            <label className="font-mono text-[10px] text-paper-mute tracking-wider uppercase block mb-1.5">Category</label>
            <div className="grid grid-cols-5 gap-1">
              {(['quote', 'follow-up', 'invoice', 'thank-you', 'general'] as const).map((c) => (
                <button key={c} type="button" onClick={() => setCategory(c)} className={`py-1.5 text-[10px] uppercase rounded border ${
                  category === c ? 'border-signal bg-signal/10 text-signal' : 'border-rule text-paper-mute'
                }`}>{c}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="font-mono text-[10px] text-paper-mute tracking-wider uppercase">Subject</label>
              <div className="flex gap-1 flex-wrap">
                {MERGE_TAGS.map((m) => (
                  <button key={m.tag} type="button" onClick={() => insertTag(m.tag, 'subject')} className="font-mono text-[9px] px-1.5 py-0.5 bg-rule hover:bg-paper-dim rounded text-paper-mute hover:text-paper">
                    {m.tag}
                  </button>
                ))}
              </div>
            </div>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject line (for emails)" className="w-full bg-ink border border-rule rounded-md px-3 py-2 text-paper text-sm placeholder-paper-dim outline-none focus:border-signal/40"/>
          </div>
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="font-mono text-[10px] text-paper-mute tracking-wider uppercase">Body</label>
              <div className="flex gap-1 flex-wrap">
                {MERGE_TAGS.map((m) => (
                  <button key={m.tag} type="button" onClick={() => insertTag(m.tag, 'body')} className="font-mono text-[9px] px-1.5 py-0.5 bg-rule hover:bg-paper-dim rounded text-paper-mute hover:text-paper">
                    {m.tag}
                  </button>
                ))}
              </div>
            </div>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} placeholder="Message body..." className="w-full bg-ink border border-rule rounded-md px-3 py-2 text-paper text-sm placeholder-paper-dim outline-none focus:border-signal/40 resize-none font-mono"/>
          </div>
        </div>
        <div className="px-5 py-3 border-t border-rule flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-xs text-paper-mute hover:text-paper">Cancel</button>
          <button onClick={save} disabled={saving || !name || !body} className="px-4 py-2 bg-signal hover:bg-signal-bright text-white rounded-md text-xs font-medium disabled:opacity-50">
            {saving ? '...' : (template ? 'Save Changes' : 'Create Template')}
          </button>
        </div>
      </div>
    </div>
  );
}
