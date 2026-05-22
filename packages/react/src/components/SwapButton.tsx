import { useEffect, useState } from 'react';
import './SwapButton.css';

export interface SwapButtonProps {
  onSwap: () => void;
}

export function SwapButton({ onSwap }: SwapButtonProps) {
  const [vertical, setVertical] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const update = () => setVertical(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return (
    <button
      type="button"
      className="wdg-swap-button"
      aria-label="Swap panel positions"
      title="Swap panels"
      onClick={onSwap}
    >
      {vertical ? '⇅' : '⇄'}
    </button>
  );
}
