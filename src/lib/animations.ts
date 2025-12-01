import { Variants } from "framer-motion";

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
  }
};

export const cardHover: Variants = {
  rest: { scale: 1 },
  hover: { 
    scale: 1.02,
    transition: { duration: 0.3, ease: "easeOut" }
  }
};

export const staggerChildren: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

export const tryonMorph: Variants = {
  initial: { scale: 0.95, opacity: 0 },
  animate: { 
    scale: 1, 
    opacity: 1,
    transition: { 
      duration: 0.8, 
      ease: [0.22, 1, 0.36, 1]
    }
  }
};

export const shimmer: Variants = {
  initial: { backgroundPosition: "200% 0" },
  animate: { 
    backgroundPosition: "-200% 0",
    transition: { 
      repeat: Infinity,
      duration: 3,
      ease: "linear"
    }
  }
};

export const progressBar: Variants = {
  initial: { scaleX: 0, originX: 0 },
  animate: (progress: number) => ({
    scaleX: progress / 100,
    transition: { duration: 0.5, ease: "easeOut" }
  })
};

export const focusGlow: Variants = {
  rest: { boxShadow: "0 0 0 0 hsl(var(--primary) / 0)" },
  focus: { 
    boxShadow: "0 0 0 4px hsl(var(--primary) / 0.2)",
    transition: { duration: 0.2 }
  }
};
