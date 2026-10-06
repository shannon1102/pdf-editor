export type MergeProgress = {
  current: number;
  total: number;
  fileName: string;
};

export class MergePdfError extends Error {
  constructor(
    message: string,
    public readonly fileName?: string,
  ) {
    super(message);
    this.name = "MergePdfError";
  }
}

const MIN_FILES = 2;
const MAX_FILES_SOFT = 20;
const MAX_TOTAL_BYTES_SOFT = 100 * 1024 * 1024;

export function validatePdfFiles(files: File[]): string | null {
  if (files.length < MIN_FILES) {
    return `Cần ít nhất ${MIN_FILES} file PDF để gộp.`;
  }
  for (const file of files) {
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      return `"${file.name}" không phải file PDF.`;
    }
  }
  if (files.length > MAX_FILES_SOFT) {
    return `Khuyến nghị tối đa ${MAX_FILES_SOFT} file mỗi lần để tránh hết bộ nhớ trình duyệt.`;
  }
  const total = files.reduce((sum, f) => sum + f.size, 0);
  if (total > MAX_TOTAL_BYTES_SOFT) {
    return `Tổng dung lượng vượt ~100MB — có thể chậm hoặc lỗi trên thiết bị yếu.`;
  }
  return null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function mergePdfFiles(
  files: File[],
  onProgress?: (progress: MergeProgress) => void,
): Promise<Uint8Array> {
  const hardError = validatePdfFiles(files);
  if (hardError && files.length < MIN_FILES) {
    throw new MergePdfError(hardError);
  }

  const { PDFDocument } = await import("pdf-lib");
  const merged = await PDFDocument.create();
  const total = files.length;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.({ current: i + 1, total, fileName: file.name });

    let buf: ArrayBuffer;
    try {
      buf = await file.arrayBuffer();
    } catch {
      throw new MergePdfError("Không đọc được file.", file.name);
    }

    let pdf;
    try {
      pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
    } catch {
      throw new MergePdfError(
        "Không mở được PDF (có thể bị mã hóa hoặc file hỏng).",
        file.name,
      );
    }

    const indices = pdf.getPageIndices();
    if (indices.length === 0) {
      throw new MergePdfError("PDF không có trang nào.", file.name);
    }

    const pages = await merged.copyPages(pdf, indices);
    for (const page of pages) {
      merged.addPage(page);
    }
  }

  return merged.save();
}

export async function countPdfPages(file: File): Promise<number> {
  const { PDFDocument } = await import("pdf-lib");
  const buf = await file.arrayBuffer();
  const pdf = await PDFDocument.load(buf, { ignoreEncryption: true });
  return pdf.getPageCount();
}
