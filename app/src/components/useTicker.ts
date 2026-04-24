import { useEffect, useRef, useState } from "react";

export function useTicker(
  interval?: number,
  onTickerEnd?: () => unknown,
): {
  tick: number;
  triggerTicker: () => void;
} {
  const stamp = useRef(0);
  const [tick, setTick] = useState(0);
  const step = interval || 60;

  const triggerTicker = () => (stamp.current = Number(Date.now()));

  useEffect(() => {
    const id = setInterval(() => {
      const offset = Math.floor((Number(Date.now()) - stamp.current) / 1000);
      setTick(step - offset);
    }, 250);
    return () => clearInterval(id);
  }, [step]);

  useEffect(() => {
    if (stamp.current === 0) return;
    if (tick === 0) {
      onTickerEnd && onTickerEnd();
      stamp.current = 0;
    }
  }, [onTickerEnd, tick]);

  return {
    tick: tick < 0 ? 0 : tick > step ? step : tick,
    triggerTicker,
  };
}
