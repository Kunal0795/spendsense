import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/index.js';
import { useHaptics } from './useHaptics.js';

let revealedSet = new Set();
let timers = new Map();
let listeners = new Set();

function notify() {
  listeners.forEach(l => l());
}

export function usePrivateMode() {
  const isPrivateSetting = useLiveQuery(() => db.settings.get('privateMode'));
  const isPrivate = isPrivateSetting?.value === 'true';
  const { triggerLight } = useHaptics();

  const [tick, setTick] = useState(0);

  useEffect(() => {
    listeners.add(setTick);
    return () => listeners.delete(setTick);
  }, []);

  const togglePrivate = async () => {
    triggerLight();
    await db.settings.put({ key: 'privateMode', value: isPrivate ? 'false' : 'true' });
  };

  const revealAmount = (id) => {
    triggerLight();
    revealedSet.add(id);
    notify();

    // Clear existing timer if any
    if (timers.has(id)) {
      clearTimeout(timers.get(id));
    }

    const timerId = setTimeout(() => {
      revealedSet.delete(id);
      timers.delete(id);
      notify();
    }, 3000);

    timers.set(id, timerId);
  };

  const isRevealed = (id) => revealedSet.has(id);

  return { isPrivate, togglePrivate, revealAmount, isRevealed };
}
