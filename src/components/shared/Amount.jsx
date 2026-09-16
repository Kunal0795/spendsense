import { useMemo } from "react";
import { usePrivateMode } from "../../hooks/usePrivateMode.js";

// Utility to generate a unique ID based on the value and a random salt if not provided
export default function Amount({ value, id, className = "" }) {
  const { isPrivate, revealAmount, isRevealed } = usePrivateMode();
  
  // Stable ID for the component instance if one isn't explicitly provided
  const amountId = useMemo(() => id || `amt-${Math.random().toString(36).substr(2, 9)}`, [id]);
  
  const hidden = isPrivate && !isRevealed(amountId);

  if (hidden) {
    return (
      <span 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          revealAmount(amountId);
        }}
        className={`cursor-pointer blur-sm select-none transition-all ${className}`}
        title="Tap to reveal"
      >
        ₹ ••••
      </span>
    );
  }

  return <span className={className}>{value}</span>;
}
