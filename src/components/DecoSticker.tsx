import { motion } from "motion/react";

interface DecoStickerProps {
  type: "star" | "heart" | "sparkle" | "flower";
  className?: string;
  size?: number;
  delay?: number;
}

export default function DecoSticker({ type, className = "", size = 24, delay = 0 }: DecoStickerProps) {
  const getSvg = () => {
    switch (type) {
      case "sparkle":
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            className="text-amber-400 stroke-amber-500/30"
            strokeWidth="1"
          >
            <path
              d="M12 2C12 7.5 14.5 10 20 12C14.5 14 12 16.5 12 22C12 16.5 9.5 14 4 12C9.5 10 12 7.5 12 2Z"
              fill="currentColor"
            />
          </svg>
        );
      case "heart":
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            className="text-rose-400 fill-rose-300 stroke-rose-400/20"
            strokeWidth="1.5"
          >
            <path
              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
              fill="currentColor"
            />
          </svg>
        );
      case "flower":
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            className="text-pink-300 stroke-pink-400/30"
            strokeWidth="1"
          >
            <path
              d="M12 8a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm0-6a3.5 3.5 0 0 1 3.5 3.5c0 1.25-.66 2.35-1.65 3a3.5 3.5 0 1 1-3.7 0c-.99-.65-1.65-1.75-1.65-3A3.5 3.5 0 0 1 12 2zm6.5 6.5a3.5 3.5 0 0 1 0 7c-1.25 0-2.35-.66-3-1.65a3.5 3.5 0 1 1 0-3.7c.99.99 3 1.65 3 1.65zM12 22a3.5 3.5 0 0 1-3.5-3.5c0-1.25.66-2.35 1.65-3a3.5 3.5 0 1 1 3.7 0c.99.65 1.65 1.75 1.65 3A3.5 3.5 0 0 1 12 22zM5.5 8.5c1.25 0 2.35.66 3 1.65a3.5 3.5 0 1 1 0 3.7c-.65.99-1.75 1.65-3 1.65a3.5 3.5 0 0 1 0-7z"
              fill="currentColor"
            />
          </svg>
        );
      case "star":
      default:
        return (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            className="text-sky-300 fill-sky-200 stroke-sky-300/20"
            strokeWidth="1.5"
          >
            <path
              d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
              fill="currentColor"
            />
          </svg>
        );
    }
  };

  return (
    <motion.div
      id={`deco-sticker-${type}-${delay}`}
      className={`pointer-events-none select-none z-10 ${className}`}
      animate={{
        y: [0, -10, 0],
        rotate: [0, 5, -5, 0],
        scale: [1, 1.05, 0.95, 1],
      }}
      transition={{
        duration: 4 + Math.random() * 2,
        repeat: Infinity,
        repeatType: "reverse",
        ease: "easeInOut",
        delay: delay,
      }}
    >
      {getSvg()}
    </motion.div>
  );
}
