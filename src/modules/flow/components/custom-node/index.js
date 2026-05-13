import React, { memo, useState, useEffect, useRef } from 'react';
import { Handle } from 'reactflow';
import styles from './styles.module.css';
import clsx from 'clsx';

// ─── Progress helpers (localStorage keyed per roadmap URL) ───────────────────
const getProgressKey = () => {
    if (typeof window === 'undefined') return null;
    const parts = window.location.pathname.split('/');
    return `rp-${parts[parts.length - 1]}`;
};
const loadDone = () => {
    try {
        const k = getProgressKey();
        return k ? new Set(JSON.parse(localStorage.getItem(k) || '[]')) : new Set();
    } catch { return new Set(); }
};
const saveDone = (set) => {
    try {
        const k = getProgressKey();
        if (k) localStorage.setItem(k, JSON.stringify([...set]));
    } catch { }
};

// ─── Resource platforms ───────────────────────────────────────────────────────
const PLATFORMS = [
    {
        id: 'youtube',
        label: 'YouTube',
        icon: '▶',
        color: '#ff4444',
        build: (q) => `https://www.youtube.com/results?search_query=${q}+tutorial`,
    },
    {
        id: 'google',
        label: 'Google',
        icon: 'G',
        color: '#4285F4',
        build: (q) => `https://www.google.com/search?q=learn+${q}+tutorial`,
    },
    {
        id: 'freecodecamp',
        label: 'freeCodeCamp',
        icon: '</>',
        color: '#00b300',
        build: (q) => `https://www.freecodecamp.org/news/search/?query=${q}`,
    },
    {
        id: 'mdn',
        label: 'MDN Docs',
        icon: '📄',
        color: '#83d0f2',
        build: (q) => `https://developer.mozilla.org/en-US/search?q=${q}`,
    },
    {
        id: 'geeksforgeeks',
        label: 'GeeksForGeeks',
        icon: '⚙',
        color: '#2f8d46',
        build: (q) => `https://www.geeksforgeeks.org/search/?q=${q}`,
    },
    {
        id: 'w3schools',
        label: 'W3Schools',
        icon: 'W3',
        color: '#04AA6D',
        build: (q) => `https://www.w3schools.com/search/search_result.php?search=${q}`,
    },
];

// ─── Resource Popup ───────────────────────────────────────────────────────────
function ResourcePopup({ title, onClose }) {
    const q = encodeURIComponent(title);
    const ref = useRef(null);

    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) onClose();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    // Stop reactflow drag/zoom while popup is open
    const stop = (e) => e.stopPropagation();

    return (
        <div className={styles.popupOverlay} onMouseDown={stop} onClick={stop} onWheel={stop}>
            <div ref={ref} className={styles.popup}>
                <div className={styles.popupHeader}>
                    <div className={styles.popupTitleRow}>
                        <span className={styles.popupEmoji}>📚</span>
                        <div>
                            <div className={styles.popupHeading}>Learn this topic</div>
                            <div className={styles.popupTopicName}>{title}</div>
                        </div>
                    </div>
                    <button className={styles.popupClose} onClick={onClose}>✕</button>
                </div>

                <p className={styles.popupSub}>Choose a platform to open →</p>

                <div className={styles.platformGrid}>
                    {PLATFORMS.map((p) => (
                        <a
                            key={p.id}
                            href={p.build(q)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.platformCard}
                            style={{ '--accent': p.color }}
                        >
                            <span className={styles.platformIcon}>{p.icon}</span>
                            <span className={styles.platformLabel}>{p.label}</span>
                            <span className={styles.platformArrow}>↗</span>
                        </a>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ─── Node component ───────────────────────────────────────────────────────────
export default memo(({ data: { label, title, level, clone }, sourcePosition, targetPosition }) => {
    const [done, setDone]           = useState(false);
    const [showPopup, setShowPopup] = useState(false);

    // Resolve plain string title from data.title OR from JSX label
    const plainTitle = title
        || (typeof label === 'string' ? label : '')
        || (label?.props?.children ?? '');

    useEffect(() => {
        if (clone || level === 0) return;
        setDone(loadDone().has(plainTitle));
    }, [plainTitle, clone, level]);

    const toggleDone = (e) => {
        e.stopPropagation();
        const stored = loadDone();
        stored.has(plainTitle) ? stored.delete(plainTitle) : stored.add(plainTitle);
        saveDone(stored);
        setDone(s => !s);
    };

    const hClass = (pos) =>
        pos === sourcePosition || pos === targetPosition ? styles.handle : styles.handleDeActive;

    const handles = (
        <>
            <Handle className={hClass('top')}    type="source" position="top"    id="a" />
            <Handle className={hClass('right')}  type="source" position="right"  id="b" />
            <Handle className={hClass('bottom')} type="source" position="bottom" id="c" />
            <Handle className={hClass('left')}   type="source" position="left"   id="d" />
        </>
    );

    // ── Clone ─────────────────────────────────────────────────────────────────
    if (clone) return <div className={styles.nodeClone}>{handles}</div>;

    // ── Root (Level 0) ────────────────────────────────────────────────────────
    if (level === 0) {
        return (
            <div className={styles.nodeLevel0}>
                <span className={styles.rootLabel}>{label}</span>
                {handles}
            </div>
        );
    }

    // ── Level 1 & 2+ ─────────────────────────────────────────────────────────
    return (
        <>
            {showPopup && (
                <ResourcePopup title={plainTitle} onClose={() => setShowPopup(false)} />
            )}

            <div className={clsx(
                level === 1 ? styles.nodeLevel1 : styles.nodeOtherLevel,
                done && styles.nodeDone
            )}>
                {/* ✅ Tick */}
                <button
                    className={clsx(styles.tickBtn, done && styles.tickDone)}
                    onClick={toggleDone}
                    title={done ? 'Mark as not done' : 'Mark as done'}
                >
                    {done ? '✓' : '○'}
                </button>

                {/* Label */}
                <span className={clsx(styles.nodeLabel, done && styles.labelDone)}>
                    {label}
                </span>

                {/* 🔗 Resource button */}
                <button
                    className={styles.resourceBtn}
                    onClick={(e) => { e.stopPropagation(); setShowPopup(true); }}
                    title={`Study resources: ${plainTitle}`}
                >
                    ↗
                </button>

                {handles}
            </div>
        </>
    );
});