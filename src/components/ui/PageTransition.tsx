// src/components/ui/PageTransition.tsx
import { motion, AnimatePresence } from 'framer-motion';
import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: ReactNode;
  mode?: 'wait' | 'sync' | 'popLayout';
}

const variants = {
  initial: { opacity: 0, scale: 0.98, filter: 'blur(4px)' },
  animate: { opacity: 1, scale: 1, filter: 'blur(0px)' },
  exit: { opacity: 0, scale: 1.02, filter: 'blur(4px)' }
};

export const PageTransition = ({ children, mode = 'wait' }: PageTransitionProps) => {
  const location = useLocation();

  return (
    <AnimatePresence mode={mode}>
      <motion.div
        key={location.pathname}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ type: 'tween', ease: 'easeInOut', duration: 0.3 }}
        className="w-full h-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};
