import { motion } from 'framer-motion';

export default function Card({ children, className = '', hover = false, glow }) {
  const baseClasses = glow ? 'glass-card-elevated' : 'glass-card';
  const hoverProps = hover ? { whileHover: { y: -5, transition: { duration: 0.2 } } } : {};
  const glowStyle = glow ? { boxShadow: `0 0 20px ${glow}40, inset 0 0 10px ${glow}20`, borderColor: `${glow}60` } : {};

  return (
    <motion.div
      className={`p-6 ${baseClasses} ${className}`}
      {...hoverProps}
      style={glowStyle}
    >
      {children}
    </motion.div>
  );
}
