"use client";

import { useEffect, useState, useRef } from 'react';

export default function useSelfieCapture() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const prevUrl = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (prevUrl.current) {
        URL.revokeObjectURL(prevUrl.current);
        prevUrl.current = null;
      }
    };
  }, []);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (prevUrl.current) {
      URL.revokeObjectURL(prevUrl.current);
      prevUrl.current = null;
    }
    if (f) {
      const url = URL.createObjectURL(f);
      prevUrl.current = url;
      setPreview(url);
    } else {
      setPreview(null);
    }
  }

  function clear() {
    if (prevUrl.current) {
      URL.revokeObjectURL(prevUrl.current);
      prevUrl.current = null;
    }
    setFile(null);
    setPreview(null);
  }

  return { file, preview, onChange, clear, setFile } as const;
}
