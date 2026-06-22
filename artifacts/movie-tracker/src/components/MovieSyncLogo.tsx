export default function MovieSyncLogo({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="1" y="6" width="30" height="20" rx="3" fill="currentColor" />
      <rect x="1"    y="9.5"  width="5.5" height="3.5" rx="0.8" fill="#0a0a0c" />
      <rect x="1"    y="16.5" width="5.5" height="3.5" rx="0.8" fill="#0a0a0c" />
      <rect x="25.5" y="9.5"  width="5.5" height="3.5" rx="0.8" fill="#0a0a0c" />
      <rect x="25.5" y="16.5" width="5.5" height="3.5" rx="0.8" fill="#0a0a0c" />
      <path d="M13.5 13L21 16L13.5 19V13Z" fill="#0a0a0c" />
    </svg>
  );
}
