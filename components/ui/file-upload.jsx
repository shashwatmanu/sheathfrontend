// "@/components/ui/file-upload.jsx"
"use client";

import React, { useRef, useState, useCallback } from "react";

export function FileUpload({
  onChange,
  accept = "",
  label = "Choose file",
  name = "file",
}) {
  const inputRef = useRef(null);
  const [hover, setHover] = useState(false);
  const [file, setFile] = useState(null);

  const openPicker = useCallback(() => {
    if (inputRef.current) inputRef.current.click();
  }, []);

  const handleFiles = useCallback(
    (filesList) => {
      const f = filesList && filesList.length ? filesList[0] : null;
      setFile(f);
      if (onChange) onChange(f ? [f] : []); // keep same shape you used (files array)
    },
    [onChange]
  );

  const onInputChange = (e) => {
    // User may press "Cancel" -> files length = 0; do NOT re-trigger anything
    handleFiles(e.target.files);
    // Reset input value so selecting same file later still triggers change
    e.target.value = "";
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setHover(false);
    handleFiles(e.dataTransfer.files);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setHover(true);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setHover(false);
  };

  const clearFile = () => {
    setFile(null);
    if (onChange) onChange([]);
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept={accept}
        style={{ display: "none" }}
        onChange={onInputChange}
      />

      <div
        onClick={openPicker}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        style={{
          border: "1px dashed #cfd4dc",
          borderRadius: 12,
          padding: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          cursor: "pointer",
          background: hover ? "#f7f9fc" : "#fff",
          transition: "background 120ms ease, border-color 120ms ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            aria-hidden
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              display: "grid",
              placeItems: "center",
              fontSize: 18,
            }}
          >
            📄
          </div>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>
              {file ? file.name : label}
            </div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              Drag & drop or click to browse
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {file && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                clearFile();
              }}
              style={{
                border: "1px solid #e5e7eb",
                background: "#fff",
                borderRadius: 8,
                padding: "6px 10px",
              }}
            >
              Remove
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openPicker();
            }}
            style={{
              background: "#111111",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "6px 12px",
            }}
          >
            Browse
          </button>
        </div>
      </div>
    </div>
  );
}
