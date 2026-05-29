import { useId } from 'react'

/* 6 avatares selecionáveis. avatarId (1..6) já existe no schema do personagem. */
export const AVATARS = [
    { id: 1, bg: ['#7cb8ff', '#2563eb'], skin: '#f4c9a3', sh: '#e3aa82', hair: '#3a2a1c', brow: '#2a1d12', style: 'short', shirt: '#22304d', collar: '#2c3e63' },
    { id: 2, bg: ['#d2a8ff', '#7c3aed'], skin: '#e6b089', sh: '#d2966c', hair: '#6b4423', brow: '#4d2f15', style: 'long', shirt: '#3a2a55', collar: '#46315f' },
    { id: 3, bg: ['#fda4d4', '#db2777'], skin: '#d2a87f', sh: '#bd8f63', hair: '#16161c', brow: '#0d0d12', style: 'bun', shirt: '#42203a', collar: '#522948' },
    { id: 4, bg: ['#5eead4', '#0d9488'], skin: '#a06f45', sh: '#875b36', hair: '#14121a', brow: '#0a090f', style: 'curly', shirt: '#0f3f3b', collar: '#155049' },
    { id: 5, bg: ['#fcd34d', '#ea580c'], skin: '#f1c59e', sh: '#dba87b', hair: '#b5341f', brow: '#7d2415', style: 'cap', shirt: '#3a2f18', collar: '#4a3c1f' },
    { id: 6, bg: ['#86efac', '#16a34a'], skin: '#f6d4b6', sh: '#e3b892', hair: '#aab2bf', brow: '#8a93a3', style: 'beanie', shirt: '#173d27', collar: '#1e4d31' },
]

function HairBack({ a }) {
    if (a.style !== 'long') return null
    return (
        <>
            <path d="M22 48 Q20 86 34 92 L34 60 Q26 56 26 46 Z M78 48 Q80 86 66 92 L66 60 Q74 56 74 46 Z" fill={a.hair} />
            <ellipse cx="50" cy="50" rx="28" ry="30" fill={a.hair} />
        </>
    )
}

function HairFront({ a }) {
    const h = a.hair
    switch (a.style) {
        case 'short':
            return <path d="M28 47 Q27 24 50 24 Q73 24 72 47 Q70 35 60 34 Q56 31 50 32 Q44 31 40 34 Q30 35 28 47 Z" fill={h} />
        case 'long':
            return <path d="M28 46 Q27 25 50 25 Q73 25 72 46 Q69 36 58 35 Q54 33 50 33 Q46 33 42 35 Q31 36 28 46 Z" fill={h} />
        case 'bun':
            return (
                <>
                    <circle cx="50" cy="19" r="8" fill={h} />
                    <circle cx="50" cy="19" r="8" fill="#000" opacity="0.12" />
                    <path d="M28 46 Q27 24 50 24 Q73 24 72 46 Q69 35 50 35 Q31 35 28 46 Z" fill={h} />
                </>
            )
        case 'curly':
            return (
                <>
                    {[[34, 30, 9], [44, 25, 9.5], [55, 25, 9.5], [66, 30, 9], [28, 39, 7.5], [72, 39, 7.5], [39, 38, 7], [61, 38, 7]].map(
                        ([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill={h} />
                    )}
                    <path d="M30 40 Q50 30 70 40" fill="none" stroke={h} strokeWidth="6" />
                </>
            )
        case 'cap':
            return (
                <>
                    <path d="M27 40 Q28 20 50 20 Q72 20 73 40 Q60 31 50 31 Q40 31 27 40 Z" fill={h} />
                    <path d="M46 40 Q74 36 84 45 Q66 49 46 45 Z" fill={h} />
                    <path d="M46 40 Q74 36 84 45 Q66 49 46 45 Z" fill="#000" opacity="0.15" />
                    <circle cx="50" cy="21" r="2.6" fill="#fff" opacity="0.55" />
                </>
            )
        case 'beanie':
            return (
                <>
                    <path d="M27 43 Q27 18 50 18 Q73 18 73 43 Z" fill={h} />
                    <rect x="25" y="39" width="50" height="8" rx="4" fill={h} />
                    <rect x="25" y="39" width="50" height="8" rx="4" fill="#fff" opacity="0.08" />
                    <path d="M33 39 V47 M41 39 V47 M50 39 V47 M59 39 V47 M67 39 V47" stroke="#000" strokeOpacity="0.12" strokeWidth="1.5" />
                </>
            )
        default:
            return null
    }
}

export function Avatar({ id = 1, size = 48, className = '' }) {
    const a = AVATARS.find((x) => x.id === Number(id)) || AVATARS[0]
    const uid = useId().replace(/:/g, '')
    const g = `bg-${uid}`
    const c = `cl-${uid}`
    return (
        <svg viewBox="0 0 100 100" width={size} height={size} className={className} aria-hidden="true">
            <defs>
                <radialGradient id={g} cx="50%" cy="38%" r="75%">
                    <stop offset="0%" stopColor={a.bg[0]} />
                    <stop offset="100%" stopColor={a.bg[1]} />
                </radialGradient>
                <clipPath id={c}><circle cx="50" cy="50" r="50" /></clipPath>
            </defs>
            <g clipPath={`url(#${c})`}>
                <rect width="100" height="100" fill={`url(#${g})`} />
                <HairBack a={a} />
                <path d="M28 102 Q28 80 50 80 Q72 80 72 102 Z" fill={a.shirt} />
                <path d="M41 82 Q50 90 59 82 L59 78 Q50 84 41 78 Z" fill={a.collar} />
                <rect x="44.5" y="62" width="11" height="15" rx="5" fill={a.skin} />
                <rect x="44.5" y="62" width="11" height="6" rx="3" fill={a.sh} opacity="0.6" />
                <circle cx="30" cy="47" r="3.6" fill={a.skin} />
                <circle cx="70" cy="47" r="3.6" fill={a.skin} />
                <circle cx="50" cy="46" r="20" fill={a.skin} />
                <path d="M30 46 a20 20 0 0 0 40 0 a20 24 0 0 1 -40 0 Z" fill={a.sh} opacity="0.18" />
                <HairFront a={a} />
                <path d="M39 41 q3.5 -2 7 0" stroke={a.brow} strokeWidth="2" fill="none" strokeLinecap="round" />
                <path d="M54 41 q3.5 -2 7 0" stroke={a.brow} strokeWidth="2" fill="none" strokeLinecap="round" />
                <ellipse cx="42.5" cy="47" rx="2.6" ry="3.2" fill="#2b2330" />
                <circle cx="43.4" cy="46" r="0.9" fill="#fff" opacity="0.9" />
                <ellipse cx="57.5" cy="47" rx="2.6" ry="3.2" fill="#2b2330" />
                <circle cx="58.4" cy="46" r="0.9" fill="#fff" opacity="0.9" />
                <path d="M48.5 50 q1.5 2 3 0" stroke={a.sh} strokeWidth="1.4" fill="none" strokeLinecap="round" opacity="0.7" />
                <circle cx="37.5" cy="53" r="3.4" fill="#ff7a7a" opacity="0.2" />
                <circle cx="62.5" cy="53" r="3.4" fill="#ff7a7a" opacity="0.2" />
                <path d="M44 56 Q50 61 56 56" stroke="#9c4a3c" strokeWidth="2.2" fill="none" strokeLinecap="round" />
            </g>
            <circle cx="50" cy="50" r="49" fill="none" stroke="#000" strokeOpacity="0.15" strokeWidth="2" />
        </svg>
    )
}

export default Avatar