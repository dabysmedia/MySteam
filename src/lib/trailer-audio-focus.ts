type MuteCallback = () => void;

let activeId: string | null = null;
const listeners = new Map<string, MuteCallback>();

/** Register a trailer player; `onMutedByOther` runs when another player claims audio. */
export function registerTrailerAudio(id: string, onMutedByOther: MuteCallback): () => void {
  listeners.set(id, onMutedByOther);
  return () => {
    listeners.delete(id);
    if (activeId === id) activeId = null;
  };
}

/** True when a different player currently owns trailer audio. */
export function hasOtherTrailerAudio(id: string): boolean {
  return activeId !== null && activeId !== id;
}

/** Mute all other players and mark this one as the active audio source. */
export function claimTrailerAudio(id: string): void {
  if (activeId === id) return;

  for (const [listenerId, mute] of listeners) {
    if (listenerId !== id) mute();
  }
  activeId = id;
}

/** Release audio focus when this player stops producing audible output. */
export function releaseTrailerAudio(id: string): void {
  if (activeId === id) activeId = null;
}
