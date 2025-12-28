"use client";
import React, { useState, useRef, useEffect } from "react";
import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from "motion/react";
import { cn } from "../../utils";

export const WobbleCard = ({
  children,
  containerClassName,
  className,
  ...props
}: {
  children: React.ReactNode;
  containerClassName?: string;
  className?: string;
  [key: string]: any;
}) => {
  const ref = useRef<HTMLElement>(null);
  const [isHovering, setIsHovering] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 15, stiffness: 150, mass: 0.5 };
  const springX = useSpring(mouseX, springConfig);
  const springY = useSpring(mouseY, springConfig);

  const handleMouseMove = (event: React.MouseEvent<HTMLElement>) => {
    const { clientX, clientY } = event;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (clientX - (rect.left + rect.width / 2)) / 20;
    const y = (clientY - (rect.top + rect.height / 2)) / 20;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    mouseX.set(0);
    mouseY.set(0);
  };

  // Subtle 3D tilt
  const rotateX = useTransform(springY, [-10, 10], [5, -5]);
  const rotateY = useTransform(springX, [-10, 10], [-5, 5]);

  return (
    <motion.section
      ref={ref}
      {...props}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        perspective: "1000px",
        ...props.style,
      }}
      className={cn(
        "mx-auto w-full relative rounded-2xl overflow-hidden",
        containerClassName
      )}
    >
      <motion.div
        style={{
          rotateX,
          rotateY,
          scale: isHovering ? 1.02 : 1,
        }}
        className="relative h-full [background-image:radial-gradient(88%_100%_at_top,rgba(255,255,255,0.5),rgba(255,255,255,0))] sm:mx-0 sm:rounded-2xl overflow-hidden transition-all duration-200"
      >
        <div
          className="absolute inset-0 w-full h-full bg-black/10 z-0 pointer-events-none"
          style={{
            boxShadow:
              "0 10px 32px rgba(34, 42, 53, 0.12), 0 1px 1px rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(34, 42, 53, 0.05), 0 4px 6px rgba(34, 42, 53, 0.08), 0 24px 108px rgba(47, 48, 55, 0.10)",
          }}
        />

        <motion.div
          style={{
            x: springX,
            y: springY,
          }}
          className={cn("h-full px-4 py-6 sm:px-6 relative z-10", className)}
        >
          <Noise />
          {children}
        </motion.div>
      </motion.div>
    </motion.section>
  );
};

const Noise = () => {
  return (
    <div
      className="absolute inset-0 w-full h-full scale-[1.2] transform opacity-10 [mask-image:radial-gradient(#fff,transparent,75%)] pointer-events-none"
      style={{
        backgroundImage: "url(/noise.webp)",
        backgroundSize: "30%",
      }}
    ></div>
  );
};

