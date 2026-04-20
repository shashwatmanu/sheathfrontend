"use client";
import React from "react";
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useTransform,
} from "motion/react";
import { useRef } from "react";
import { cn } from "../../utils";

export function Button({
  borderRadius = "1.75rem",
  children,
  as: Component = "button",
  containerClassName,
  borderClassName,
  duration,
  className,
  ...otherProps
}: {
  borderRadius?: string;
  children: React.ReactNode;
  as?: any;
  containerClassName?: string;
  borderClassName?: string;
  duration?: number;
  className?: string;
  [key: string]: any;
}) {
  return (
    <Component
      className={cn(
        "relative h-16 w-40 overflow-hidden bg-transparent p-[1px] text-xl",
        containerClassName,
      )}
      style={{
        borderRadius: borderRadius,
      }}
      {...otherProps}
    >
      <div
        className="absolute inset-0"
        style={{ borderRadius: `calc(${borderRadius} * 0.96)` }}
      >
        <MovingBorder duration={duration} rx="30%" ry="30%">
          <div
            className={cn(
              "h-20 w-20 bg-[radial-gradient(#0ea5e9_60%,transparent_40%)] opacity-[1]",
              borderClassName,
              
            )}
          />
        </MovingBorder>
      </div>

      <div
        className={cn(
          "relative flex h-full w-full items-center justify-center border border-slate-800 bg-slate-900/[0.8] text-sm text-white antialiased backdrop-blur-xl",
          className,
        )}
        style={{
          borderRadius: `calc(${borderRadius} * 0.96)`,
        }}
      >
        {children}
      </div>
    </Component>
  );
}

export const MovingBorder = ({
  children,
  duration = 3000,
  rx,
  ry,
  ...otherProps
}: {
  children: React.ReactNode;
  duration?: number;
  rx?: string;
  ry?: string;
  [key: string]: any;
}) => {
  const pathRef = useRef<any>(null);
  const progress = useMotionValue<number>(0);

  useAnimationFrame((time) => {
    const length = pathRef.current?.getTotalLength();
    if (length) {
      const pxPerMillisecond = length / duration;
      progress.set((time * pxPerMillisecond) % length);
    }
  });

  // Optimization: useTransform merges the getPointAtLength queries into a single call.
  // Instead of querying x and y separately (which calls getPointAtLength twice per frame),
  // we do it once to halve the DOM layout calculations.
  const transform = useTransform(progress, (val) => {
    const point = pathRef.current?.getPointAtLength(val);
    if (point) {
      return `translateX(${point.x}px) translateY(${point.y}px) translateX(-50%) translateY(-50%)`;
    }
    return `translateX(0px) translateY(0px) translateX(-50%) translateY(-50%)`;
  });

  return (
    <>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        className="absolute h-full w-full"
        width="100%"
        height="100%"
        {...otherProps}
      >
        <rect
          fill="none"
          width="100%"
          height="100%"
          rx={rx}
          ry={ry}
          ref={pathRef}
        />
      </svg>
      <motion.div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          display: "inline-block",
          transform,
        }}
      >
        {children}
      </motion.div>
    </>
  );
};
