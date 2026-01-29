import { cn } from "../../utils";
import React, { useRef, useState, useEffect, useId } from "react";
import { motion } from "motion/react";
import { IconUpload, IconX } from "@tabler/icons-react";
import { useDropzone } from "react-dropzone";

const DARK_MODE_STORAGE_KEY = "sheath_dark_mode";

const getStoredDarkModePreference = () => {
  if (typeof window === "undefined") return false;
  const storedPreference = window.localStorage.getItem(DARK_MODE_STORAGE_KEY);
  return storedPreference === "true";
};

const DARK_BG = "#0f172a";
const DARK_SURFACE = "#1e293b";
const DARK_TILE_LIGHT = "#132038";
const DARK_TILE_DARK = "#091427";

const mainVariant = {
  initial: { x: 0, y: 0 },
  animate: { x: 20, y: -20, opacity: 0.9 },
};

const secondaryVariant = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
};

export const FileUpload = ({
  onChange,
  accept,
  uploaderId, // 👈 expects a unique id per uploader instance
  darkMode,
  multiple = false,
}: {
  onChange?: (files: File[]) => void;
  accept?: string;
  uploaderId: string;
  darkMode?: boolean;
  multiple?: boolean;
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [effectiveDarkMode, setEffectiveDarkMode] = useState<boolean>(() => {
    if (typeof darkMode === "boolean") return darkMode;
    return getStoredDarkModePreference();
  });

  const handleFileChange = (newFiles: File[]) => {
    setFiles((prevFiles) => (multiple ? [...prevFiles, ...newFiles] : newFiles));
  };

  // notify parent after render
  useEffect(() => {
    if (onChange) onChange(files);
  }, [files, onChange]);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      return updated;
    });

    // reset native input so user can re-upload same file if needed
    if (fileInputRef.current) {
      try {
        fileInputRef.current.value = "";
      } catch (e) {
        // ignore if not supported
      }
    }
  };

  const buildAcceptConfig = (accept?: string) => {
    if (!accept) return undefined;
    const types = accept.split(",").map((t) => t.trim());
    const config: Record<string, string[]> = {};
    types.forEach((t) => {
      config[t] = [];
    });
    return config;
  };

  const { getRootProps, isDragActive } = useDropzone({
    multiple: multiple,
    noClick: true,
    accept: buildAcceptConfig(accept),
    onDrop: handleFileChange,
  });

  useEffect(() => {
    if (typeof darkMode === "boolean") {
      setEffectiveDarkMode(darkMode);
      if (process.env.NODE_ENV !== "production") {
        console.debug(`[FileUpload:${uploaderId}] darkMode prop provided:`, darkMode);
      }
      return;
    }

    const syncFromStorage = () => {
      const storedPreference = getStoredDarkModePreference();
      setEffectiveDarkMode(storedPreference);
      if (process.env.NODE_ENV !== "production") {
        console.debug(
          `[FileUpload:${uploaderId}] darkMode prop missing, using stored value:`,
          storedPreference
        );
      }
    };

    syncFromStorage();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === DARK_MODE_STORAGE_KEY) {
        setEffectiveDarkMode(event.newValue === "true");
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [darkMode, uploaderId]);

  return (
    <div className="w-full" {...getRootProps()}>
      <motion.div
        onClick={handleClick}
        whileHover="animate"
        className="p-10 group/file block rounded-lg cursor-pointer w-full relative overflow-hidden"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => handleFileChange(Array.from(e.target.files || []))}
          className="hidden"
        />

        {/* Hide grid pattern in dark mode */}
        <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]">
          <GridPattern darkMode={effectiveDarkMode} />
        </div>

        <div className="flex flex-col items-center justify-center">
          {/* Upload file label - darker in dark mode */}
          <p
            className={cn(
              "relative z-20 font-bold text-base",
              effectiveDarkMode ? "text-white" : "text-neutral-700"
            )}
          >
            Upload file
          </p>
          {/* Drag or drop text - darker in dark mode */}
          <p
            className={cn(
              "relative z-20 text-base mt-3 mt-2",
              effectiveDarkMode ? "text-neutral-500" : "text-neutral-700"
            )}
          >
            Drag or drop your files here or click to upload
          </p>
          <div className="relative w-full mt-10 max-w-xl mx-auto">
            {files.length > 0 &&
              files.map((file, idx) => (
                <motion.div
                  key={`${uploaderId}-file-${idx}`}
                  layoutId={`${uploaderId}-file-${idx}`}
                  className={cn(
                    "relative overflow-hidden z-40 flex flex-col items-start justify-start md:h-24 p-4 mt-4 w-full mx-auto rounded-md shadow-sm",
                    !effectiveDarkMode && "bg-white"
                  )}
                  style={
                    effectiveDarkMode ? { backgroundColor: DARK_SURFACE } : undefined
                  }
                >
                  {/* remove button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(idx);
                    }}
                    className={cn(
                      "absolute right-2 top-2 p-1 rounded-full",
                      effectiveDarkMode ? "hover:bg-neutral-800" : "hover:bg-neutral-100"
                    )}
                    aria-label={`Remove ${file.name}`}
                  >
                    <IconX
                      className={cn(
                        "w-4 h-4",
                        effectiveDarkMode ? "text-neutral-400" : "text-neutral-500"
                      )}
                    />
                  </button>

                  <div className="flex justify-between w-full items-center gap-4">
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      layout
                      className={cn(
                        "text-base truncate max-w-xs",
                        effectiveDarkMode ? "text-neutral-300" : "text-neutral-700"
                      )}
                    >
                      {file.name}
                    </motion.p>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      layout
                      className={cn(
                        "rounded-lg px-2 py-1 w-fit shrink-0 text-sm shadow-input",
                        effectiveDarkMode ? "text-white" : "text-neutral-600 bg-neutral-100"
                      )}
                      style={
                        effectiveDarkMode ? { backgroundColor: DARK_TILE_LIGHT } : undefined
                      }
                    >
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </motion.p>
                  </div>

                  <div
                    className={cn(
                      "flex text-sm md:flex-row flex-col items-start md:items-center w-full mt-2 justify-between",
                      effectiveDarkMode ? "text-neutral-300" : "text-neutral-600"
                    )}
                  >
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      layout
                      className={cn(
                        "px-1 py-0.5 rounded-md",
                        effectiveDarkMode ? "text-white" : "text-neutral-700 bg-gray-100"
                      )}
                      style={
                        effectiveDarkMode ? { backgroundColor: DARK_TILE_LIGHT } : undefined
                      }
                    >
                      {file.type}
                    </motion.p>

                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} layout>
                      modified {new Date(file.lastModified).toLocaleDateString()}
                    </motion.p>
                  </div>
                </motion.div>
              ))}

            {!files.length && (
              <motion.div
                layoutId={`${uploaderId}-empty`}
                variants={mainVariant}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className={cn(
                  "relative group-hover/file:shadow-2xl z-40 flex items-center justify-center h-32 mt-4 w-full max-w-[8rem] mx-auto rounded-md shadow-[0px_10px_50px_rgba(0,0,0,0.1)]",
                  !effectiveDarkMode && "bg-white"
                )}
                style={
                  effectiveDarkMode ? { backgroundColor: DARK_SURFACE } : undefined
                }
              >
                {isDragActive ? (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={cn(
                      "flex flex-col items-center",
                      effectiveDarkMode ? "text-neutral-500" : "text-neutral-600"
                    )}
                  >
                    Drop it
                    <IconUpload
                      className={cn(
                        "h-4 w-4",
                        effectiveDarkMode ? "text-neutral-500" : "text-neutral-600"
                      )}
                    />
                  </motion.p>
                ) : (
                  <IconUpload
                    className={cn(
                      "h-4 w-4",
                      effectiveDarkMode ? "text-neutral-500" : "text-neutral-600"
                    )}
                  />
                )}
              </motion.div>
            )}

            {!files.length && (
              <motion.div
                variants={secondaryVariant}
                className="absolute opacity-0 border border-dashed border-sky-400 inset-0 z-30 bg-transparent flex items-center justify-center h-32 mt-4 w-full max-w-[8rem] mx-auto rounded-md"
              />
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export function GridPattern({ darkMode = false }: { darkMode?: boolean }) {
  const columns = 41;
  const rows = 11;
  const id = useId();
  const patternId = `grid-pattern-${id}`;
  const clipId = `cell-clip-${id}`;

  return (
    <div
      className={cn(
        "flex shrink-0 justify-center items-center scale-105",
        !darkMode && "bg-gray-100"
      )}
      style={{
        backgroundColor: darkMode ? DARK_BG : undefined,
        width: "fit-content",
        height: "fit-content",
      }}
    >
      <svg
        width={columns * 40 + (columns - 1)}
        height={rows * 40 + (rows - 1)}
        style={{ overflow: "visible" }}
      >
        <defs>
          <pattern
            id={patternId}
            x="0"
            y="0"
            width="82"
            height="82"
            patternUnits="userSpaceOnUse"
          >
            {/* Even Cells */}
            <rect
              x="0"
              y="0"
              width="40"
              height="40"
              rx="2"
              fill={darkMode ? DARK_TILE_LIGHT : "#F9FAFB"}
            />
            <rect
              x="41"
              y="41"
              width="40"
              height="40"
              rx="2"
              fill={darkMode ? DARK_TILE_LIGHT : "#F9FAFB"}
            />

            {/* Odd Cells */}
            <g>
              <rect
                x="41"
                y="0"
                width="40"
                height="40"
                rx="2"
                fill={darkMode ? DARK_TILE_DARK : "transparent"}
              />
              <rect
                x="0"
                y="41"
                width="40"
                height="40"
                rx="2"
                fill={darkMode ? DARK_TILE_DARK : "transparent"}
              />

              {/* Shadow Overlay */}
              <clipPath id={clipId}>
                <rect x="41" y="0" width="40" height="40" rx="2" />
                <rect x="0" y="41" width="40" height="40" rx="2" />
              </clipPath>

              <g clipPath={`url(#${clipId})`}>
                <rect
                  x="41"
                  y="0"
                  width="40"
                  height="40"
                  rx="2"
                  fill="none"
                  stroke={darkMode ? "rgba(8, 14, 24, 0.65)" : "white"}
                  strokeWidth="6"
                />
                <rect
                  x="0"
                  y="41"
                  width="40"
                  height="40"
                  rx="2"
                  fill="none"
                  stroke={darkMode ? "rgba(8, 14, 24, 0.65)" : "white"}
                  strokeWidth="6"
                />
              </g>
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
    </div>
  );
}