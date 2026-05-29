import { getAvatarById } from '../data/avatarTheme'

function AvatarFallback({ avatar }) {
    return (
        <div
            className="grid h-full w-full place-items-center rounded-full text-sm font-black text-white"
            style={{
                background: `
                    radial-gradient(circle at 30% 20%, rgba(255,255,255,0.45), transparent 28%),
                    linear-gradient(135deg, ${avatar.fallback[0]}, ${avatar.fallback[1]})
                `,
            }}
        >
            {avatar.id}
        </div>
    )
}

export function Avatar({
    id = 1,
    size = 48,
    selected = false,
    className = '',
}) {
    const avatar = getAvatarById(id)

    return (
        <div
            className={[
                'relative grid shrink-0 place-items-center rounded-full',
                'transition-all duration-200 ease-out',
                selected ? 'scale-105' : 'hover:scale-105',
                className,
            ].join(' ')}
            style={{
                width: size,
                height: size,
            }}
            title={avatar.name}
            aria-label={avatar.name}
        >
            <div
                className="relative h-full w-full overflow-hidden rounded-full p-[3px]"
                style={{
                    background: selected
                        ? `linear-gradient(135deg, ${avatar.theme.secondary}, ${avatar.theme.primary})`
                        : 'rgba(255,255,255,0.12)',
                    boxShadow: selected
                        ? `0 0 18px ${avatar.theme.glow}`
                        : '0 0 0 rgba(0,0,0,0)',
                }}
            >
                <div className="relative h-full w-full overflow-hidden rounded-full bg-transparent">
                    <img
                        src={avatar.image}
                        alt={avatar.name}
                        className="h-full w-full rounded-full object-cover"
                        draggable="false"
                        onError={(event) => {
                            event.currentTarget.style.display = 'none'

                            const fallback = event.currentTarget.nextElementSibling

                            if (fallback) {
                                fallback.style.display = 'grid'
                            }
                        }}
                    />

                    <div className="hidden h-full w-full">
                        <AvatarFallback avatar={avatar} />
                    </div>
                </div>
            </div>

            {selected && (
                <span className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-white/20" />
            )}
        </div>
    )
}

export default Avatar