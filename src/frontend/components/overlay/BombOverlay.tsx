export function BombOverlay({ round, timerPhase }: any) {
  const isPlanted = timerPhase === 'bomb' || round?.bomb === 'planted';

  if (!isPlanted) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-0">
      <div className="w-full h-full border-[8px] border-red-600/30 animate-pulse" />
    </div>
  );
}