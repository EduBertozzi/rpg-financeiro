// Logo do banco Maré: duas ondas sobre um quadrado arredondado.
export default function MareLogo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <rect width="40" height="40" rx="12" fill="#fff" />
      <path d="M8 17c4-4 8-4 12 0s8 4 12 0" fill="none" stroke="#12B5A6" strokeWidth="3.4" strokeLinecap="round" />
      <path d="M8 25c4-4 8-4 12 0s8 4 12 0" fill="none" stroke="#12B5A6" strokeWidth="3.4" strokeLinecap="round" opacity="0.55" />
    </svg>
  )
}
