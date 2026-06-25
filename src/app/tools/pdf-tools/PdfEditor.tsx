"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Bold,
  Italic,
  Trash2,
  Download,
} from "lucide-react";

type Annotation = {
  id: string;
  pageIndex: number;
  pdfX: number;
  pdfY: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  bold: boolean;
  italic: boolean;
};

type PageData = {
  pdfWidth: number;
  pdfHeight: number;
  dataUrl: string;
};

const FONTS = ["Helvetica", "Times-Roman", "Courier"];
const FONT_CSS: Record<string, string> = {
  Helvetica: "Helvetica, Arial, sans-serif",
  "Times-Roman": "'Times New Roman', Times, serif",
  Courier: "'Courier New', Courier, monospace",
};
const RENDER_SCALE = 2;
const MAX_WIDTH = 680;

export default function PdfEditor({
  fileData,
  fileName,
}: {
  fileData: ArrayBuffer;
  fileName: string;
}) {
  const [pages, setPages] = useState<PageData[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(16);
  const [fontFamily, setFontFamily] = useState("Helvetica");
  const [color, setColor] = useState("#000000");
  const [bold, setBold] = useState(false);
  const [italic, setItalic] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load and render PDF pages to images
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

      const pdf = await pdfjsLib.getDocument({
        data: new Uint8Array(fileData),
      }).promise;

      if (cancelled) return;

      const rendered: PageData[] = [];
      for (let i = 0; i < pdf.numPages; i++) {
        const page = await pdf.getPage(i + 1);
        const viewport = page.getViewport({ scale: RENDER_SCALE });

        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d")!;
        await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;

        rendered.push({
          pdfWidth: viewport.width / RENDER_SCALE,
          pdfHeight: viewport.height / RENDER_SCALE,
          dataUrl: canvas.toDataURL(),
        });
      }

      if (!cancelled) {
        setPages(rendered);
        setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [fileData]);

  const getDisplayScale = (page: PageData) =>
    Math.min(MAX_WIDTH / page.pdfWidth, 1);

  // Click on page to add annotation
  const handlePageClick = (
    e: React.MouseEvent<HTMLDivElement>,
    pageIndex: number
  ) => {
    if ((e.target as HTMLElement).closest("[data-ann]")) return;

    const page = pages[pageIndex];
    const scale = getDisplayScale(page);
    const rect = e.currentTarget.getBoundingClientRect();
    const pdfX = (e.clientX - rect.left) / scale;
    const pdfY = (e.clientY - rect.top) / scale;

    const id = crypto.randomUUID();
    setAnnotations((prev) => [
      ...prev,
      { id, pageIndex, pdfX, pdfY, fontSize, fontFamily, color, bold, italic },
    ]);
    setSelectedId(id);

    setTimeout(() => {
      document.getElementById(`ann-${id}`)?.focus();
    }, 30);
  };

  const updateAnn = (id: string, updates: Partial<Annotation>) => {
    setAnnotations((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
  };

  const deleteAnn = (id: string) => {
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const applyToSelected = (updates: Partial<Annotation>) => {
    if (selectedId) updateAnn(selectedId, updates);
  };

  // Export with text baked in
  const exportPdf = async () => {
    setProcessing(true);
    try {
      const { PDFDocument, rgb, StandardFonts } = await import("pdf-lib");
      const doc = await PDFDocument.load(fileData);

      const fonts: Record<string, any> = {
        Helvetica: await doc.embedFont(StandardFonts.Helvetica),
        "Helvetica-bold": await doc.embedFont(StandardFonts.HelveticaBold),
        "Helvetica-italic": await doc.embedFont(
          StandardFonts.HelveticaOblique
        ),
        "Times-Roman": await doc.embedFont(StandardFonts.TimesRoman),
        "Times-Roman-bold": await doc.embedFont(StandardFonts.TimesRomanBold),
        "Times-Roman-italic": await doc.embedFont(
          StandardFonts.TimesRomanItalic
        ),
        Courier: await doc.embedFont(StandardFonts.Courier),
        "Courier-bold": await doc.embedFont(StandardFonts.CourierBold),
        "Courier-italic": await doc.embedFont(StandardFonts.CourierOblique),
      };

      const hexToRgb = (hex: string) => {
        const n = parseInt(hex.slice(1), 16);
        return rgb(
          ((n >> 16) & 255) / 255,
          ((n >> 8) & 255) / 255,
          (n & 255) / 255
        );
      };

      for (const ann of annotations) {
        const el = document.getElementById(`ann-${ann.id}`);
        const text = el?.innerText || "";
        if (!text.trim()) continue;

        const pdfPage = doc.getPage(ann.pageIndex);
        const { height: pageH } = pdfPage.getSize();

        const suffix = ann.bold ? "-bold" : ann.italic ? "-italic" : "";
        const font = fonts[`${ann.fontFamily}${suffix}`] || fonts["Helvetica"];

        const lines = text.split("\n");
        lines.forEach((line, li) => {
          pdfPage.drawText(line, {
            x: ann.pdfX,
            y: pageH - ann.pdfY - ann.fontSize - li * ann.fontSize * 1.2,
            size: ann.fontSize,
            font,
            color: hexToRgb(ann.color),
          });
        });
      }

      const bytes = await doc.save();
      const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `edited-${fileName}`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="inline-block w-6 h-6 border-2 border-neutral-600 border-t-blue-500 rounded-full animate-spin mb-3" />
        <p className="text-neutral-500 text-sm">Rendering PDF...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 bg-[#141414] border border-[#222] rounded-xl flex-wrap sticky top-0 z-20">
        <select
          value={fontFamily}
          onChange={(e) => {
            setFontFamily(e.target.value);
            applyToSelected({ fontFamily: e.target.value });
          }}
          className="bg-[#1a1a1a] border border-[#333] rounded px-2 py-1.5 text-xs text-white focus:border-blue-500 focus:outline-none"
        >
          {FONTS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>

        <input
          type="number"
          value={fontSize}
          onChange={(e) => {
            const s = Number(e.target.value);
            setFontSize(s);
            applyToSelected({ fontSize: s });
          }}
          min={6}
          max={200}
          className="w-14 bg-[#1a1a1a] border border-[#333] rounded px-2 py-1.5 text-xs text-white text-center focus:border-blue-500 focus:outline-none"
        />

        <div className="w-px h-5 bg-[#333]" />

        <button
          onClick={() => {
            const next = !bold;
            setBold(next);
            if (next) setItalic(false);
            applyToSelected({ bold: next, italic: false });
          }}
          className={`p-1.5 rounded transition-colors ${
            bold
              ? "bg-blue-500/20 text-blue-400"
              : "text-neutral-500 hover:text-white"
          }`}
        >
          <Bold size={14} />
        </button>
        <button
          onClick={() => {
            const next = !italic;
            setItalic(next);
            if (next) setBold(false);
            applyToSelected({ italic: next, bold: false });
          }}
          className={`p-1.5 rounded transition-colors ${
            italic
              ? "bg-blue-500/20 text-blue-400"
              : "text-neutral-500 hover:text-white"
          }`}
        >
          <Italic size={14} />
        </button>

        <div className="w-px h-5 bg-[#333]" />

        <label className="relative cursor-pointer">
          <div
            className="w-7 h-7 rounded border border-[#444] hover:border-[#666] transition-colors"
            style={{ backgroundColor: color }}
          />
          <input
            type="color"
            value={color}
            onChange={(e) => {
              setColor(e.target.value);
              applyToSelected({ color: e.target.value });
            }}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </label>

        {selectedId && (
          <>
            <div className="w-px h-5 bg-[#333]" />
            <button
              onClick={() => deleteAnn(selectedId)}
              className="p-1.5 rounded text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </>
        )}

        <div className="flex-1" />

        <button
          onClick={exportPdf}
          disabled={processing || annotations.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
        >
          <Download size={14} />
          {processing ? "Processing..." : "Export PDF"}
        </button>
      </div>

      <p className="text-xs text-neutral-600 text-center">
        Click anywhere on the page to add text
      </p>

      {/* Pages */}
      <div className="space-y-6 pb-8">
        {pages.map((page, i) => {
          const scale = getDisplayScale(page);
          const w = page.pdfWidth * scale;
          const h = page.pdfHeight * scale;

          return (
            <div key={i} className="mx-auto" style={{ width: w }}>
              <div className="text-xs text-neutral-600 mb-1">
                Page {i + 1}
              </div>
              <div
                className="relative cursor-text shadow-lg shadow-black/30"
                style={{ width: w, height: h }}
                onClick={(e) => handlePageClick(e, i)}
              >
                {/* Rendered PDF page */}
                <img
                  src={page.dataUrl}
                  alt={`Page ${i + 1}`}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  draggable={false}
                />

                {/* Text annotations */}
                {annotations
                  .filter((a) => a.pageIndex === i)
                  .map((ann) => (
                    <div
                      key={ann.id}
                      data-ann
                      className={`absolute group ${
                        selectedId === ann.id
                          ? "ring-2 ring-blue-500"
                          : "hover:ring-1 hover:ring-blue-500/40"
                      }`}
                      style={{
                        left: ann.pdfX * scale,
                        top: ann.pdfY * scale,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(ann.id);
                        setFontSize(ann.fontSize);
                        setFontFamily(ann.fontFamily);
                        setColor(ann.color);
                        setBold(ann.bold);
                        setItalic(ann.italic);
                      }}
                    >
                      <div
                        id={`ann-${ann.id}`}
                        contentEditable
                        suppressContentEditableWarning
                        className="outline-none whitespace-pre min-w-[4px] min-h-[1em]"
                        style={{
                          fontSize: ann.fontSize * scale,
                          fontFamily: FONT_CSS[ann.fontFamily],
                          color: ann.color,
                          fontWeight: ann.bold ? "bold" : "normal",
                          fontStyle: ann.italic ? "italic" : "normal",
                          lineHeight: 1.2,
                        }}
                        onFocus={() => {
                          setSelectedId(ann.id);
                          setFontSize(ann.fontSize);
                          setFontFamily(ann.fontFamily);
                          setColor(ann.color);
                          setBold(ann.bold);
                          setItalic(ann.italic);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                      />
                    </div>
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
