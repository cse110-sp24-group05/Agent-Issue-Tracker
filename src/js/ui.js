/**
 * ui.js — shared rendering helpers used across pages.
 * Pure functions only. No DOM access, no localStorage access.
 */

export const esc = s =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const PRI_BADGE = { P0: 'badge-p0', P1: 'badge-p1', P2: 'badge-p2', P3: 'badge-p3' };
const STA_BADGE = {
  'open':           'badge-open',
  'in-progress':    'badge-in-progress',
  'pending-review': 'badge-pending-review',
  'blocked':        'badge-blocked',
  'closed':         'badge-closed'
};
const STA_LABEL = {
  'open':           'Open',
  'in-progress':    'In Progress',
  'pending-review': 'Pending Review',
  'blocked':        'Blocked',
  'closed':         'Closed'
};

export const priBadge = p => PRI_BADGE[p] || 'badge-p3';
export const staBadge = s => STA_BADGE[s] || '';
export const staLabel = s => STA_LABEL[s] || s;

/**
 * Returns an icon for the originator of an issue.
 *   human-manual → ✍️
 *   llm-assist   → ✨
 *   any other (treated as agent name) → 🤖
 * @param createdBy
 */
export function createdByIcon(createdBy) {
  if (createdBy === 'human-manual') {return '✍️';}
  if (createdBy === 'llm-assist')   {return '✨';}
  return '🤖';
}

/**
 * Relative time string: "just now", "32s ago", "5m ago", "3h ago", "2d ago".
 * Single source of truth — pages must import this rather than re-implementing.
 * @param iso
 */
export function fmtRelTime(iso) {
  if (!iso) {return '—';}
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 0)   {return 'just now';}
  if (s < 10)  {return 'just now';}
  if (s < 60)  {return `${s}s ago`;}
  const m = Math.floor(s / 60);
  if (m < 60)  {return `${m}m ago`;}
  const h = Math.floor(m / 60);
  if (h < 24)  {return `${h}h ago`;}
  const d = Math.floor(h / 24);
  return d === 1 ? '1d ago' : `${d}d ago`;
}

/**
 * Short calendar date, e.g. "May 7".
 * @param iso
 */
export function fmtShortDate(iso) {
  if (!iso) {return '—';}
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Date + time, e.g. "May 7, 2026, 8:30 AM".
 * @param iso
 */
export function fmtDateTime(iso) {
  if (!iso) {return '—';}
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
       + ', ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/**
 * Color-coded flash highlight for an entity (table row or board card).
 * Adds a class for ~2.2s that pulses background + outline so a developer
 * can immediately spot what changed. Each `kind` has its own color:
 *
 *   create   → green   (something new appeared)
 *   claim    → amber   (in-progress)
 *   complete → purple  (pending review)
 *   close    → green-dark (done)
 *   block    → red
 *   update   → blue    (generic / default)
 *
 * Looks up *every* element with [data-id="id"] so it lights up in both
 * the list view and the board view simultaneously when they're side-by-side.
 */
const FLASH_KIND = {
  create:   { cls: 'flash-create',   ms: 2200 },
  claim:    { cls: 'flash-claim',    ms: 2200 },
  complete: { cls: 'flash-complete', ms: 2200 },
  close:    { cls: 'flash-close',    ms: 2200 },
  block:    { cls: 'flash-block',    ms: 2200 },
  update:   { cls: 'flash-update',   ms: 1800 }
};

const ALL_FLASH_CLASSES = Object.values(FLASH_KIND).map(c => c.cls);

/**
 *
 * @param id
 * @param kind
 */
export function flashEntity(id, kind = 'update') {
  if (!id) {return;}
  const cfg = FLASH_KIND[kind] || FLASH_KIND.update;
  document.querySelectorAll(`[data-id="${CSS.escape(id)}"]`).forEach(el => {
    el.classList.remove(...ALL_FLASH_CLASSES);
    // Force reflow so the animation restarts even if the same class was just removed.
    void el.offsetWidth;
    el.classList.add(cfg.cls);
    setTimeout(() => el.classList.remove(cfg.cls), cfg.ms);
  });
}
