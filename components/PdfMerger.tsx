"use client";

import {
  countPdfPages,
  formatBytes,
  mergePdfFiles,
  MergePdfError,
  validatePdfFiles,
  type MergeProgress,
} from "@/lib/merge-pdfs";
import { useCallback, useRef, useState } from "react";

type ListedFile = {
  id: string;
  file: File;
  pageCount: number | null;
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function PdfMerger() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<ListedFile[]>([]);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);
  const [progress, setProgress] = useState<MergeProgress | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const totalBytes = items.reduce((s, i) => s + i.file.size, 0);

  const refreshWarning = useCallback((files: File[]) => {
    const msg = validatePdfFiles(files);
    setWarning(msg && files.length >= 2 ? msg : null);
  }, []);

  const addFiles = useCallback(
    async (fileList: FileList | File[]) => {
      setError(null);
      const incoming = Array.from(fileList).filter((f) => {
        const isPdf =
          f.type === "application/pdf" ||
          f.name.toLowerCase().endsWith(".pdf");
        return isPdf;
      });

      if (incoming.length === 0) {
        setError("Chỉ chấp nhận file PDF.");
        return;
      }

      const newItems: ListedFile[] = incoming.map((file) => ({
        id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
        file,
        pageCount: null,
      }));

      setItems((prev) => {
        const next = [...prev, ...newItems];
        refreshWarning(next.map((i) => i.file));
        return next;
      });

      for (const entry of newItems) {
        try {
          const pages = await countPdfPages(entry.file);
          setItems((prev) =>
            prev.map((i) =>
              i.id === entry.id ? { ...i, pageCount: pages } : i,
            ),
          );
        } catch {
          setItems((prev) =>
            prev.map((i) =>
              i.id === entry.id ? { ...i, pageCount: null } : i,
            ),
          );
        }
      }
    },
    [refreshWarning],
  );

  const moveItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    setItems((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      refreshWarning(next.map((i) => i.file));
      return next;
    });
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      refreshWarning(next.map((i) => i.file));
      return next;
    });
  };

  const resetAll = () => {
    setItems([]);
    setWarning(null);
    setError(null);
    setProgress(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleMerge = async () => {
    setError(null);
    const files = items.map((i) => i.file);
    const validation = validatePdfFiles(files);
    if (files.length < 2) {
      setError(validation ?? "Cần ít nhất 2 file PDF.");
      return;
    }

    setMerging(true);
    setProgress(null);
    try {
      const bytes = await mergePdfFiles(files, setProgress);
      const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
      const stamp = new Date().toISOString().slice(0, 10);
      downloadBlob(blob, `gop-pdf-${stamp}.pdf`);
      resetAll();
    } catch (e) {
      if (e instanceof MergePdfError) {
        setError(
          e.fileName ? `${e.message} (${e.fileName})` : e.message,
        );
      } else {
        setError("Gộp PDF thất bại. Thử lại hoặc kiểm tra file.");
      }
    } finally {
      setMerging(false);
      setProgress(null);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) {
      void addFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Gộp PDF
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        Chọn nhiều file PDF (ví dụ 5 hóa đơn) → gộp thành một file theo thứ tự
        bên dưới. File chỉ xử lý trên máy bạn, không gửi lên server.
      </p>
      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">
        Gộp theo từng trang; bookmark/form cấp tài liệu có thể không được giữ.
      </p>

      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`mt-6 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-10 transition-colors ${
          dragOver
            ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
            : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-700"
        }`}
      >
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Kéo thả PDF vào đây hoặc bấm để chọn
        </span>
        <span className="mt-1 text-xs text-zinc-500">Chọn nhiều file cùng lúc</span>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="sr-only"
          onChange={(e) => {
            if (e.target.files?.length) void addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </label>

      {items.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>
              {items.length} file · {formatBytes(totalBytes)}
            </span>
            <button
              type="button"
              onClick={resetAll}
              className="text-zinc-600 underline hover:text-zinc-900 dark:hover:text-zinc-200"
            >
              Làm mới
            </button>
          </div>
          <ul className="max-h-64 space-y-2 overflow-y-auto">
            {items.map((item, index) => (
              <li
                key={item.id}
                className="flex items-center gap-2 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <span className="min-w-0 flex-1 truncate text-sm text-zinc-800 dark:text-zinc-200">
                  {item.file.name}
                  {item.pageCount != null && (
                    <span className="text-zinc-500"> · {item.pageCount} trang</span>
                  )}
                </span>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    aria-label="Lên"
                    disabled={index === 0}
                    onClick={() => moveItem(index, -1)}
                    className="rounded px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-200 disabled:opacity-30 dark:hover:bg-zinc-800"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    aria-label="Xuống"
                    disabled={index === items.length - 1}
                    onClick={() => moveItem(index, 1)}
                    className="rounded px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-200 disabled:opacity-30 dark:hover:bg-zinc-800"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    aria-label="Xóa"
                    onClick={() => removeItem(item.id)}
                    className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {warning && (
        <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">{warning}</p>
      )}
      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {merging && progress && (
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          Đang gộp… ({progress.current}/{progress.total}) — {progress.fileName}
        </p>
      )}

      <button
        type="button"
        disabled={merging || items.length < 2}
        onClick={() => void handleMerge()}
        className="mt-6 w-full rounded-xl bg-zinc-900 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      >
        {merging ? "Đang gộp…" : "Gộp và tải về"}
      </button>
    </div>
  );
}
