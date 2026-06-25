"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Upload,
  Merge,
  Scissors,
  RotateCw,
  Trash2,
  Download,
  GripVertical,
  Plus,
  X,
  FileText,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

type PdfFile = {
  id: string;
  name: string;
  data: ArrayBuffer;
  pageCount: number;
};

type Tab = "merge" | "split" | "rotate" | "organize";

export default function PdfTools() {
  const [activeTab, setActiveTab] = useState<Tab>("merge");
  const [files, setFiles] = useState<PdfFile[]>([]);
  const [processing, setProcessing] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Split options
  const [splitMode, setSplitMode] = useState<"all" | "range">("all");
  const [splitRange, setSplitRange] = useState("");

  // Rotate options
  const [rotateAngle, setRotateAngle] = useState(90);
  const [rotatePages, setRotatePages] = useState("all");

  // Organize — pages to remove
  const [removePages, setRemovePages] = useState("");

  const addFiles = useCallback(async (newFiles: File[]) => {
    const { PDFDocument } = await import("pdf-lib");
    const pdfs: PdfFile[] = [];

    for (const file of newFiles) {
      if (file.type !== "application/pdf") continue;
      try {
        const data = await file.arrayBuffer();
        const doc = await PDFDocument.load(data, { ignoreEncryption: true });
        pdfs.push({
          id: crypto.randomUUID(),
          name: file.name,
          data,
          pageCount: doc.getPageCount(),
        });
      } catch {
        // skip invalid PDFs
      }
    }

    setFiles((prev) => [...prev, ...pdfs]);
  }, []);

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const moveFile = (index: number, dir: -1 | 1) => {
    setFiles((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files));
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length) addFiles(Array.from(e.dataTransfer.files));
  };

  const downloadBlob = (bytes: Uint8Array, filename: string) => {
    const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const parsePageRange = (
    input: string,
    max: number
  ): number[] => {
    const pages = new Set<number>();
    for (const part of input.split(",")) {
      const trimmed = part.trim();
      if (trimmed.includes("-")) {
        const [a, b] = trimmed.split("-").map(Number);
        if (!isNaN(a) && !isNaN(b)) {
          for (let i = Math.max(1, a); i <= Math.min(max, b); i++) pages.add(i);
        }
      } else {
        const n = Number(trimmed);
        if (!isNaN(n) && n >= 1 && n <= max) pages.add(n);
      }
    }
    return Array.from(pages).sort((a, b) => a - b);
  };

  // ─── Actions ───────────────────────────────────────────────

  const mergePdfs = async () => {
    if (files.length < 2) return;
    setProcessing(true);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const merged = await PDFDocument.create();
      for (const file of files) {
        const src = await PDFDocument.load(file.data);
        const pages = await merged.copyPages(src, src.getPageIndices());
        pages.forEach((p) => merged.addPage(p));
      }
      const bytes = await merged.save();
      downloadBlob(bytes, "merged.pdf");
    } finally {
      setProcessing(false);
    }
  };

  const splitPdf = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const src = await PDFDocument.load(files[0].data);
      const total = src.getPageCount();

      if (splitMode === "all") {
        for (let i = 0; i < total; i++) {
          const doc = await PDFDocument.create();
          const [page] = await doc.copyPages(src, [i]);
          doc.addPage(page);
          const bytes = await doc.save();
          downloadBlob(bytes, `page-${i + 1}.pdf`);
        }
      } else {
        const pages = parsePageRange(splitRange, total);
        if (pages.length === 0) return;
        const doc = await PDFDocument.create();
        const copied = await doc.copyPages(
          src,
          pages.map((p) => p - 1)
        );
        copied.forEach((p) => doc.addPage(p));
        const bytes = await doc.save();
        downloadBlob(bytes, `pages-${splitRange.replace(/\s/g, "")}.pdf`);
      }
    } finally {
      setProcessing(false);
    }
  };

  const rotatePdf = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    try {
      const { PDFDocument, degrees } = await import("pdf-lib");
      const src = await PDFDocument.load(files[0].data);
      const total = src.getPageCount();
      const pageIndices =
        rotatePages === "all"
          ? Array.from({ length: total }, (_, i) => i)
          : parsePageRange(rotatePages, total).map((p) => p - 1);

      for (const i of pageIndices) {
        const page = src.getPage(i);
        page.setRotation(degrees(page.getRotation().angle + rotateAngle));
      }
      const bytes = await src.save();
      downloadBlob(bytes, `rotated-${files[0].name}`);
    } finally {
      setProcessing(false);
    }
  };

  const organizePdf = async () => {
    if (files.length === 0) return;
    setProcessing(true);
    try {
      const { PDFDocument } = await import("pdf-lib");
      const src = await PDFDocument.load(files[0].data);
      const total = src.getPageCount();
      const toRemove = new Set(
        parsePageRange(removePages, total).map((p) => p - 1)
      );
      const keepIndices = Array.from({ length: total }, (_, i) => i).filter(
        (i) => !toRemove.has(i)
      );

      if (keepIndices.length === 0) return;

      const doc = await PDFDocument.create();
      const pages = await doc.copyPages(src, keepIndices);
      pages.forEach((p) => doc.addPage(p));
      const bytes = await doc.save();
      downloadBlob(bytes, `organized-${files[0].name}`);
    } finally {
      setProcessing(false);
    }
  };

  const totalPages = files.reduce((sum, f) => sum + f.pageCount, 0);

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ size: number }> }[] = [
    { id: "merge", label: "Merge", icon: Merge },
    { id: "split", label: "Split", icon: Scissors },
    { id: "rotate", label: "Rotate", icon: RotateCw },
    { id: "organize", label: "Organize", icon: Trash2 },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <div className="h-12 flex items-center px-4 border-b border-[#222] bg-[#111] shrink-0">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white transition-colors"
        >
          <ChevronLeft size={16} />
          <span className="font-medium">Toolium</span>
        </Link>
        <span className="mx-3 text-[#333]">|</span>
        <h1 className="text-sm font-semibold text-white">PDF Tools</h1>
      </div>

      <div className="flex-1 max-w-3xl w-full mx-auto px-6 py-10">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-[#141414] rounded-xl border border-[#222] mb-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-[#222] text-white shadow-sm"
                    : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Upload area */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={onDrop}
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors mb-6 ${
            isDragOver
              ? "border-blue-500 bg-blue-500/5"
              : "border-[#333] hover:border-[#555]"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            multiple={activeTab === "merge"}
            onChange={onFileInput}
            className="hidden"
          />
          <FileText size={32} className="mx-auto mb-3 text-neutral-600" />
          <p className="text-neutral-400 text-sm mb-1">
            {activeTab === "merge"
              ? "Drop PDF files here or click to upload"
              : "Drop a PDF file here or click to upload"}
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-3 px-4 py-2 rounded-lg bg-[#222] hover:bg-[#2a2a2a] text-sm text-neutral-300 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Upload size={14} />
              Choose PDF{activeTab === "merge" ? "s" : ""}
            </span>
          </button>
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="space-y-2 mb-6">
            {files.map((file, i) => (
              <div
                key={file.id}
                className="flex items-center gap-3 px-4 py-3 bg-[#141414] border border-[#222] rounded-lg"
              >
                <FileText size={16} className="text-neutral-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{file.name}</p>
                  <p className="text-xs text-neutral-600">
                    {file.pageCount} page{file.pageCount !== 1 ? "s" : ""}
                  </p>
                </div>
                {activeTab === "merge" && files.length > 1 && (
                  <div className="flex gap-0.5">
                    <button
                      onClick={() => moveFile(i, -1)}
                      disabled={i === 0}
                      className="p-1 rounded text-neutral-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      onClick={() => moveFile(i, 1)}
                      disabled={i === files.length - 1}
                      className="p-1 rounded text-neutral-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>
                )}
                <button
                  onClick={() => removeFile(file.id)}
                  className="p-1.5 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            {activeTab === "merge" && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-[#333] rounded-lg text-sm text-neutral-500 hover:text-neutral-300 hover:border-[#555] transition-colors"
              >
                <Plus size={14} />
                Add more files
              </button>
            )}
          </div>
        )}

        {/* Tab-specific options */}
        {files.length > 0 && activeTab === "split" && (
          <div className="p-4 bg-[#141414] border border-[#222] rounded-xl mb-6 space-y-3">
            <div className="flex gap-2">
              <button
                onClick={() => setSplitMode("all")}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  splitMode === "all"
                    ? "bg-blue-500/20 text-blue-400"
                    : "text-neutral-500 hover:text-white"
                }`}
              >
                Extract all pages
              </button>
              <button
                onClick={() => setSplitMode("range")}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  splitMode === "range"
                    ? "bg-blue-500/20 text-blue-400"
                    : "text-neutral-500 hover:text-white"
                }`}
              >
                Extract range
              </button>
            </div>
            {splitMode === "range" && (
              <input
                type="text"
                value={splitRange}
                onChange={(e) => setSplitRange(e.target.value)}
                placeholder="e.g. 1-3, 5, 8-10"
                className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-600 focus:border-blue-500 focus:outline-none"
              />
            )}
          </div>
        )}

        {files.length > 0 && activeTab === "rotate" && (
          <div className="p-4 bg-[#141414] border border-[#222] rounded-xl mb-6 space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-xs text-neutral-500">Angle</span>
              <div className="flex gap-1">
                {[90, 180, 270].map((a) => (
                  <button
                    key={a}
                    onClick={() => setRotateAngle(a)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      rotateAngle === a
                        ? "bg-blue-500/20 text-blue-400"
                        : "text-neutral-500 hover:text-white"
                    }`}
                  >
                    {a}°
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-neutral-500">Pages</span>
              <input
                type="text"
                value={rotatePages}
                onChange={(e) => setRotatePages(e.target.value)}
                placeholder="all, or e.g. 1-3, 5"
                className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {files.length > 0 && activeTab === "organize" && (
          <div className="p-4 bg-[#141414] border border-[#222] rounded-xl mb-6 space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-xs text-neutral-500 shrink-0">
                Remove pages
              </span>
              <input
                type="text"
                value={removePages}
                onChange={(e) => setRemovePages(e.target.value)}
                placeholder="e.g. 1, 3-5, 8"
                className="flex-1 bg-[#1a1a1a] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-600 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <p className="text-xs text-neutral-600">
              {totalPages} page{totalPages !== 1 ? "s" : ""} total
            </p>
          </div>
        )}

        {/* Action button */}
        {files.length > 0 && (
          <button
            onClick={() => {
              if (activeTab === "merge") mergePdfs();
              else if (activeTab === "split") splitPdf();
              else if (activeTab === "rotate") rotatePdf();
              else if (activeTab === "organize") organizePdf();
            }}
            disabled={
              processing ||
              (activeTab === "merge" && files.length < 2) ||
              (activeTab === "organize" && !removePages.trim())
            }
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium transition-colors"
          >
            <Download size={16} />
            {processing
              ? "Processing..."
              : activeTab === "merge"
                ? `Merge ${files.length} PDFs`
                : activeTab === "split"
                  ? splitMode === "all"
                    ? `Split into ${totalPages} files`
                    : "Extract pages"
                  : activeTab === "rotate"
                    ? "Rotate & Download"
                    : "Remove pages & Download"}
          </button>
        )}
      </div>
    </div>
  );
}
