import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

/* ── Helpers ──────────────────────────────────────────────────────── */
const MONTHS_FR = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];
const DAYS_FR = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];

function parseISO(iso) {
    if (!iso) return null;
    const [y, m, d] = iso.split('-').map(Number);
    return { y, m, d };
}

function toISO(y, m, d) {
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function todayISO() {
    const now = new Date();
    return toISO(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** Returns the 6-row grid of day numbers (null = padding cell) */
function buildGrid(year, month) {
    const firstDow = new Date(year, month - 1, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month, 0).getDate();
    const prevDays = new Date(year, month - 1, 0).getDate();
    // Normalize: Mon=0 … Sun=6
    const offset = (firstDow + 6) % 7;
    const cells = [];
    for (let i = offset - 1; i >= 0; i--) cells.push({ d: prevDays - i, cur: false });
    for (let d = 1; d <= daysInMonth; d++) cells.push({ d, cur: true });
    while (cells.length % 7 !== 0) cells.push({ d: cells.length - offset - daysInMonth + 1, cur: false });
    return cells;
}

/**
 * MiniCalendar
 *
 * Props:
 *   value        {string}   ISO date "YYYY-MM-DD"
 *   onChange     {fn}       called with new ISO date
 *   className    {string}   optional extra classes on root div
 */
export default function MiniCalendar({ value, onChange, className = '' }) {
    const parsed = parseISO(value) || parseISO(todayISO());
    const [view, setView] = useState({ y: parsed.y, m: parsed.m });
    const today = parseISO(todayISO());
    const selected = parseISO(value);

    // Keep view in sync if value changes externally
    useEffect(() => {
        const p = parseISO(value);
        if (p) setView({ y: p.y, m: p.m });
    }, [value]);

    const prevMonth = () =>
        setView(({ y, m }) => m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 });
    const nextMonth = () =>
        setView(({ y, m }) => m === 12 ? { y: y + 1, m: 1 } : { y, m: m + 1 });

    const grid = buildGrid(view.y, view.m);

    const pick = (cell) => {
        if (!cell.cur) return;
        onChange?.(toISO(view.y, view.m, cell.d));
    };

    const isSelected = (cell) =>
        cell.cur &&
        selected &&
        selected.y === view.y &&
        selected.m === view.m &&
        selected.d === cell.d;

    const isToday = (cell) =>
        cell.cur &&
        today.y === view.y &&
        today.m === view.m &&
        today.d === cell.d;

    return (
        <div
            className={`select-none rounded-2xl border border-indigo-100/80 bg-white/95 p-4 shadow-lg shadow-indigo-500/10 backdrop-blur-sm ${className}`}
            style={{ minWidth: 280 }}
        >
            {/* ── Header (month navigation) ─────────────────────── */}
            <div className="mb-3 flex items-center justify-between gap-2">
                <button
                    type="button"
                    onClick={prevMonth}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-indigo-100 text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition"
                    aria-label="Mois précédent"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>

                <span className="text-[15px] font-bold text-indigo-950">
                    {MONTHS_FR[view.m - 1]} {view.y}
                </span>

                <button
                    type="button"
                    onClick={nextMonth}
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-indigo-100 text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition"
                    aria-label="Mois suivant"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>

            {/* ── Day-of-week labels ────────────────────────────── */}
            <div className="mb-1 grid grid-cols-7 gap-1">
                {DAYS_FR.map((day) => (
                    <div key={day} className="text-center text-[11px] font-semibold text-indigo-400 py-1">
                        {day}
                    </div>
                ))}
            </div>

            {/* ── Day grid ─────────────────────────────────────── */}
            <div className="grid grid-cols-7 gap-1">
                {grid.map((cell, i) => {
                    const sel = isSelected(cell);
                    const tod = isToday(cell);
                    return (
                        <button
                            key={i}
                            type="button"
                            onClick={() => pick(cell)}
                            disabled={!cell.cur}
                            className={`
                                relative flex h-9 w-full items-center justify-center rounded-xl text-[13px] font-medium transition-all
                                ${!cell.cur
                                    ? 'text-slate-300 cursor-default'
                                    : sel
                                        ? 'bg-gradient-to-br from-sky-500 via-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-400/30'
                                        : tod
                                            ? 'border border-indigo-300 bg-indigo-50 text-indigo-700 font-bold'
                                            : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-800'
                                }
                            `}
                        >
                            {cell.d}
                            {/* Today dot */}
                            {tod && !sel && (
                                <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-indigo-500" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* ── Footer actions ────────────────────────────────── */}
            <div className="mt-3 flex items-center justify-between border-t border-indigo-100/70 pt-3">
                <button
                    type="button"
                    onClick={() => {
                        setView({ y: today.y, m: today.m });
                        onChange?.(todayISO());
                    }}
                    className="text-[13px] font-semibold text-indigo-600 hover:text-indigo-800 transition"
                >
                    Aujourd'hui
                </button>
                {selected && (
                    <span className="text-[12px] text-slate-500 font-medium">
                        {String(selected.d).padStart(2, '0')}/{String(selected.m).padStart(2, '0')}/{selected.y}
                    </span>
                )}
            </div>
        </div>
    );
}

/* ── CalendarPopover ─────────────────────────────────────────────────
 * A button + floating popover that shows <MiniCalendar> on click.
 * Closes when user clicks outside.
 *
 * Props: same as MiniCalendar + optional `buttonClassName`.
 */
export function CalendarPopover({ value, onChange, buttonClassName = '' }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const parsed = parseISO(value);
    const label = parsed
        ? `${String(parsed.d).padStart(2, '0')}/${String(parsed.m).padStart(2, '0')}/${parsed.y}`
        : 'Choisir une date';

    const MONTHS_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

    return (
        <div className="relative inline-block" ref={ref}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className={`flex items-center gap-2.5 rounded-xl border px-4 py-2.5 text-sm font-semibold shadow-sm transition-all ${open
                    ? 'border-indigo-400 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-200'
                    : 'border-indigo-200/80 bg-white text-indigo-950 hover:border-indigo-300 hover:bg-indigo-50/60'
                    } ${buttonClassName}`}
            >
                {/* Calendar icon */}
                <svg className="h-4 w-4 shrink-0 text-indigo-500" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <rect x="2" y="4" width="16" height="14" rx="3" />
                    <path d="M2 8h16M6 2v4M14 2v4" strokeLinecap="round" />
                </svg>
                <span>{label}</span>
                <ChevronRight className={`h-3.5 w-3.5 text-indigo-400 transition-transform ${open ? 'rotate-90' : ''}`} />
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-2 z-50">
                    <MiniCalendar
                        value={value}
                        onChange={(iso) => {
                            onChange?.(iso);
                            setOpen(false);
                        }}
                    />
                </div>
            )}
        </div>
    );
}
