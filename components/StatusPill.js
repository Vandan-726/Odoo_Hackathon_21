'use client';
export default function StatusPill({ status }) {
    const cls = status?.toLowerCase().replace(/\s+/g, '-') || 'draft';
    return <span className={`status-pill ${cls}`}>{status}</span>;
}
