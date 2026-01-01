import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className, size = 36 }: LogoProps) {
  const bgId = `bg-${size}`;
  const tileId = `tileInnerShadow-${size}`;
  const markId = `markShadow-${size}`;
  const shineId = `shine-${size}`;

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 512 512" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id={bgId} x1="80" y1="40" x2="440" y2="480" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#45D6A4"/>
          <stop offset="1" stopColor="#29B985"/>
        </linearGradient>
        <filter id={tileId} x="-10%" y="-10%" width="120%" height="120%">
          <feOffset dx="0" dy="2" />
          <feGaussianBlur stdDeviation="6" result="blur"/>
          <feComposite in="blur" in2="SourceAlpha" operator="out" result="shadow"/>
          <feColorMatrix in="shadow" type="matrix"
            values="0 0 0 0 0
                    0 0 0 0 0.35
                    0 0 0 0 0.25
                    0 0 0 0.22 0"/>
          <feComposite in2="SourceGraphic" operator="over"/>
        </filter>
        <filter id={markId} x="-20%" y="-20%" width="140%" height="140%" filterUnits="objectBoundingBox">
          <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#0A7A54" floodOpacity="0.20"/>
        </filter>
        <radialGradient id={shineId} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse"
          gradientTransform="translate(150 120) rotate(35) scale(420 420)">
          <stop offset="0" stopColor="white" stopOpacity="0.18"/>
          <stop offset="1" stopColor="white" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <g filter={`url(#${tileId})`}>
        <rect width="512" height="512" rx="140" fill={`url(#${bgId})`}/>
        <rect width="512" height="512" rx="140" fill={`url(#${shineId})`}/>
      </g>
      <g transform="translate(0,-44)" filter={`url(#${markId})`}>
        <rect x="150" y="110" width="50" height="292" rx="25" fill="white"/>
        <path 
          d="M200 135H270C311.42 135 345 168.58 345 210C345 251.42 311.42 285 270 285H200"
          stroke="white" 
          strokeWidth="45" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
        <path 
          d="M200 285H310C359.7 285 400 325.3 400 375C400 424.7 359.7 465 310 465H200"
          stroke="#F3FFFB" 
          strokeWidth="50" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
        <circle cx="200" cy="285" r="18" fill="#39C692"/>
      </g>
      <g opacity="0.22">
        <circle cx="338" cy="350" r="6" fill="white"/>
        <circle cx="364" cy="378" r="6" fill="white"/>
        <circle cx="382" cy="412" r="6" fill="white"/>
      </g>
    </svg>
  );
}
