export const AVATARS = [
    {
        id: 1,
        name: 'O Analista',
        archetype: 'Controle financeiro',
        description: 'Frio, calculista e ótimo em manter tudo sob controle.',
        image: '/avatars/avatar-1.png',
        fallback: ['#7cb8ff', '#2563eb'],
        theme: {
            primary: '#2563EB',
            secondary: '#7CB8FF',
            background: '#07111F',
            surface: '#101B2E',
            surfaceSoft: '#17233A',
            border: '#2B3B57',
            text: '#F8FAFC',
            muted: '#93A4BD',
            glow: 'rgba(37, 99, 235, 0.45)',
        },
    },
    {
        id: 2,
        name: 'A Visionária',
        archetype: 'Investimentos e risco',
        description: 'Enxerga oportunidades antes de todo mundo.',
        image: '/avatars/avatar-2.png',
        fallback: ['#d2a8ff', '#7c3aed'],
        theme: {
            primary: '#7C3AED',
            secondary: '#D2A8FF',
            background: '#14091F',
            surface: '#211334',
            surfaceSoft: '#2D1A46',
            border: '#4C3572',
            text: '#FAF5FF',
            muted: '#C4B5FD',
            glow: 'rgba(124, 58, 237, 0.45)',
        },
    },
    {
        id: 3,
        name: 'A Criativa',
        archetype: 'Negócios e oportunidades',
        description: 'Transforma ideias pequenas em grandes jogadas.',
        image: '/avatars/avatar-3.png',
        fallback: ['#fda4d4', '#db2777'],
        theme: {
            primary: '#DB2777',
            secondary: '#FDA4D4',
            background: '#1F0715',
            surface: '#321327',
            surfaceSoft: '#431A34',
            border: '#6D2850',
            text: '#FFF7FB',
            muted: '#F9A8D4',
            glow: 'rgba(219, 39, 119, 0.45)',
        },
    },
    {
        id: 4,
        name: 'O Estrategista',
        archetype: 'Planejamento e evolução',
        description: 'Cada escolha parece pequena, mas faz parte de um plano maior.',
        image: '/avatars/avatar-4.png',
        fallback: ['#5eead4', '#0d9488'],
        theme: {
            primary: '#0D9488',
            secondary: '#5EEAD4',
            background: '#061A18',
            surface: '#102A27',
            surfaceSoft: '#173935',
            border: '#245A53',
            text: '#F0FDFA',
            muted: '#99F6E4',
            glow: 'rgba(13, 148, 136, 0.45)',
        },
    },
    {
        id: 5,
        name: 'O Ambicioso',
        archetype: 'Renda ativa',
        description: 'Não espera o dinheiro aparecer. Vai atrás dele.',
        image: '/avatars/avatar-5.png',
        fallback: ['#fcd34d', '#ea580c'],
        theme: {
            primary: '#EA580C',
            secondary: '#FCD34D',
            background: '#1F1005',
            surface: '#2F1B0C',
            surfaceSoft: '#422711',
            border: '#7C3F14',
            text: '#FFF7ED',
            muted: '#FED7AA',
            glow: 'rgba(234, 88, 12, 0.45)',
        },
    },
    {
        id: 6,
        name: 'A Equilibrada',
        archetype: 'Crescimento constante',
        description: 'Prefere consistência, segurança e evolução aos poucos.',
        image: '/avatars/avatar-6.png',
        fallback: ['#86efac', '#16a34a'],
        theme: {
            primary: '#16A34A',
            secondary: '#86EFAC',
            background: '#06180D',
            surface: '#10291A',
            surfaceSoft: '#173A24',
            border: '#245C37',
            text: '#F0FDF4',
            muted: '#BBF7D0',
            glow: 'rgba(22, 163, 74, 0.45)',
        },
    },
]

export function getAvatarById(id) {
    return AVATARS.find((avatar) => avatar.id === Number(id)) || AVATARS[0]
}

export function applyAvatarTheme(id) {
    if (typeof document === 'undefined') return

    const avatar = getAvatarById(id)
    const root = document.documentElement

    root.style.setProperty('--theme-primary', avatar.theme.primary)
    root.style.setProperty('--theme-secondary', avatar.theme.secondary)
    root.style.setProperty('--theme-bg', avatar.theme.background)
    root.style.setProperty('--theme-surface', avatar.theme.surface)
    root.style.setProperty('--theme-surface-soft', avatar.theme.surfaceSoft)
    root.style.setProperty('--theme-border', avatar.theme.border)
    root.style.setProperty('--theme-text', avatar.theme.text)
    root.style.setProperty('--theme-muted', avatar.theme.muted)
    root.style.setProperty('--theme-glow', avatar.theme.glow)
}