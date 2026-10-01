import { cn } from '../AdminLayout';

interface PlayerPortraitProps {
  avatar?: string;
  isDead?: boolean;
  className?: string;
  isLarge?: boolean;
  transparent?: boolean;
}

export function PlayerPortrait({ avatar, isDead, className, isLarge, transparent }: PlayerPortraitProps) {
  return (
    <div className={cn(
      "relative shrink-0",
      !transparent && "overflow-hidden bg-neutral-800",
      isDead && "grayscale opacity-40",
      className
    )}>
      {avatar ? (
        <img 
          src={avatar} 
          alt="Player" 
          className={cn(
            "w-full h-full transition-transform duration-500",
            transparent ? "object-contain object-bottom" : "object-cover object-[center_top]"
          )}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        <img 
          src="./icons/cs2/customplayer.svg"
          alt="Player Placeholder" 
          className={cn(
            "w-full h-full object-contain opacity-20 brightness-0 invert",
            isLarge ? "p-4" : "p-2"
          )}
        />
      )}
      
      {/* Subtle overlay gradient to blend with the card */}
      {!transparent && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      )}
      
      {/* Bottom accent for depth */}
      {!transparent && (
        <div className="absolute bottom-0 left-0 w-full h-[1px] bg-white/5" />
      )}
    </div>
  );
}
