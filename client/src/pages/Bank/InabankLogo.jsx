// Logo do Inabank: um "i" azul com uma moeda no lugar do pingo, num quadrado arredondado.
export default function InabankLogo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <rect width="40" height="40" rx="12" fill="#fff" />
      <rect x="16.5" y="17" width="7" height="15" rx="3.5" fill="#1F5FB8" />
      <circle cx="20" cy="10.5" r="5" fill="#F5BC42" stroke="#C98A12" strokeWidth="1.4" />
      <path d="M20 8.3 v4.4" stroke="#8A5A0B" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
