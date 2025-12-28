"use client";
import React from "react";
import { cn } from "../../utils";
import { useDarkMode } from "../../lib/dark-mode-context";

export const SparklesCard = ({
    children,
    className,
    containerClassName,
    sparklesColor,
    ...props
}) => {
    const { darkMode } = useDarkMode();

    return (
        <div
            className={cn(
                "relative overflow-hidden rounded-3xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-2xl transition-all duration-300",
                containerClassName
            )}
            {...props}
        >
            {/* Content */}
            <div className={cn("relative z-10", className)}>
                {children}
            </div>
        </div>
    );
};
