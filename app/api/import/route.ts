import { NextRequest, NextResponse } from 'next/server';
import { createLead } from '@/lib/db';
import { requireUser } from '@/lib/session';

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  const parseLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = '';
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQuote) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') { inQuote = false; }
        else cur += c;
      } else {
        if (c === '"') inQuote = true;
        else if (c === ',') { out.push(cur); cur = ''; }
        else cur += c;
      }
    }
    out.push(cur);
    return out;
  };
  const headers = parseLine(lines[0]).map((h) => h.trim().toLowerCase());
  const rows = lines.slice(1).map((line) => {
    const vals = parseLine(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => { obj[h] = (vals[i] || '').trim(); });
    return obj;
  });
  return { headers, rows };
}

const MAP: Record<string, string[]> = {
  name: ['name', 'customer', 'customer name', 'contact', 'contact name', 'full name'],
  phone: ['phone', 'phone number', 'mobile', 'cell', 'tel'],
  email: ['email', 'e-mail', 'email address'],
  address: ['address', 'street', 'location', 'street address'],
  value: ['value', 'amount', 'price', 'total', 'job value'],
  notes: ['notes', 'comments', 'description', 'details'],
  source: ['source', 'lead source', 'how heard', 'channel'],
};

function pick(row: Record<string, string>, target: string): string | undefined {
  for (const alias of MAP[target] || [target]) {
    if (row[alias]) return row[alias];
  }
  return undefined;
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await requireUser();
    const { csv, defaultType } = await req.json();
    if (!csv) return NextResponse.json({ error: 'csv required' }, { status: 400 });

    const { headers, rows } = parseCSV(csv);
    if (rows.length === 0) return NextResponse.json({ error: 'No data rows', headers }, { status: 400 });

    const type = (defaultType || 'lawn') as 'lawn' | 'hvac' | 'plumb' | 'other';
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const row of rows) {
      const name = pick(row, 'name');
      if (!name) { skipped++; continue; }
      try {
        await createLead({
          userId,
          name,
          phone: pick(row, 'phone'),
          email: pick(row, 'email'),
          address: pick(row, 'address'),
          status: 'new',
          type,
          value: Number(pick(row, 'value')) || 0,
          notes: pick(row, 'notes'),
          source: pick(row, 'source') || 'CSV import',
        });
        created++;
      } catch (e: any) {
        errors.push(`${name}: ${e.message}`);
      }
    }

    return NextResponse.json({ created, skipped, errors, headers });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
