"use client";
import React, { useState, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { cn } from "../../utils";

export const GlassCard = ({
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

    const springConfig = { damping: 20, stiffness: 300, mass: 0.5 };
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
    const rotateX = useTransform(springY, [-10, 10], [2, -2]);
    const rotateY = useTransform(springX, [-10, 10], [-2, 2]);

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
                "mx-auto w-full relative rounded-3xl overflow-hidden",
                containerClassName
            )}
        >
            <motion.div
                style={{
                    rotateX,
                    rotateY,
                    scale: isHovering ? 1.01 : 1,
                }}
                className="relative h-full bg-gradient-to-br from-white/90 to-white/50 dark:from-slate-900/90 dark:to-slate-900/50 backdrop-blur-2xl border border-white/40 dark:border-white/10 sm:mx-0 sm:rounded-3xl overflow-hidden transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-black/50"
            >
                {/* Premium Gradient Overlay - Very subtle */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent dark:from-white/5 dark:via-transparent dark:to-transparent pointer-events-none" />

                <div
                    className="absolute inset-0 w-full h-full bg-black/5 dark:bg-black/20 z-0 pointer-events-none"
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
            className="absolute inset-0 w-full h-full scale-[1.2] transform opacity-[0.03] dark:opacity-[0.05] [mask-image:radial-gradient(#fff,transparent,75%)] pointer-events-none mix-blend-overlay"
            style={{
                backgroundImage: "url(/noise.webp)",
                backgroundSize: "30%",
            }}
        ></div>
    );
};
