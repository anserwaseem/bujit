import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className, size = 36 }: LogoProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 512 512" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
    >
      <rect width="512" height="512" rx="140" fill="#39C692"/>
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
        stroke="white" 
        strokeWidth="50" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        opacity="0.85"
      />
      <circle cx="200" cy="285" r="18" fill="#39C692"/>
    </svg>
  );
}