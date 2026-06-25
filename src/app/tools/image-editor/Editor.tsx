"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  MousePointer2,
  Type,
  Pencil,
  Square,
  Circle,
  Minus,
  Upload,
  Undo2,
  Redo2,
  Trash2,
  Download,
  ChevronLeft,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ImageIcon,
  RotateCcw,
} from "lucide-react";

type Tool = "select" | "draw";

const FONTS = [
  "Arial",
  "Helvetica",
  "Georgia",
  "Times New Roman",
  "Courier New",
  "Verdana",
  "Impact",
  "Comic Sans MS",
];

export default function ImageEditor() {
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<any>(null);
  const fabricModuleRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const isLoadingHistory = useRef(false);

  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [selectedObj, setSelectedObj] = useState<any>(null);
  const [selectedType, setSelectedType] = useState<string>("");

  const [fillColor, setFillColor] = useState("#3b82f6");
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [brushWidth, setBrushWidth] = useState(4);
  const [fontSize, setFontSize] = useState(32);
  const [fontFamily, setFontFamily] = useState("Arial");
  const [opacity, setOpacity] = useState(100);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [textAlign, setTextAlign] = useState("left");

  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [canvasBg, setCanvasBg] = useState("#ffffff");

  // ─── History ───────────────────────────────────────────────
  const saveState = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || isLoadingHistory.current) return;
    const json = JSON.stringify(canvas.toJSON());
    historyRef.current = historyRef.current.slice(
      0,
      historyIndexRef.current + 1
    );
    historyRef.current.push(json);
    historyIndexRef.current = historyRef.current.length - 1;
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(false);
  }, []);

  const loadState = useCallback(async (json: string) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    isLoadingHistory.current = true;
    await canvas.loadFromJSON(json);
    canvas.renderAll();
    isLoadingHistory.current = false;
  }, []);

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current--;
    setCanUndo(historyIndexRef.current > 0);
    setCanRedo(true);
    loadState(historyRef.current[historyIndexRef.current]);
  }, [loadState]);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current++;
    setCanUndo(true);
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1);
    loadState(historyRef.current[historyIndexRef.current]);
  }, [loadState]);

  // ─── Helpers ───────────────────────────────────────────────
  const updateEmptyState = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    setIsEmpty(canvas.getObjects().length === 0);
  }, []);

  const getObjType = (obj: any): string => {
    if (!obj) return "";
    const t = obj.type?.toLowerCase() || "";
    if (t.includes("text")) return "text";
    if (t.includes("image")) return "image";
    if (t.includes("rect")) return "rectangle";
    if (t.includes("circle")) return "circle";
    if (t.includes("line") || t.includes("path")) return "shape";
    return "shape";
  };

  const syncFromObject = useCallback((obj: any) => {
    if (!obj) return;
    setFillColor((obj.fill as string) || "#000000");
    setStrokeColor(obj.stroke || "transparent");
    setStrokeWidth(obj.strokeWidth || 0);
    setOpacity(Math.round((obj.opacity ?? 1) * 100));
    const t = getObjType(obj);
    setSelectedType(t);
    if (t === "text") {
      setFontSize(obj.fontSize || 32);
      setFontFamily(obj.fontFamily || "Arial");
      setIsBold(obj.fontWeight === "bold");
      setIsItalic(obj.fontStyle === "italic");
      setIsUnderline(!!obj.underline);
      setTextAlign(obj.textAlign || "left");
    }
  }, []);

  // ─── Canvas Init ───────────────────────────────────────────
  useEffect(() => {
    let canvas: any;

    const init = async () => {
      const fabric = await import("fabric");
      fabricModuleRef.current = fabric;
      const container = containerRef.current!;

      canvas = new fabric.Canvas(canvasElRef.current!, {
        width: container.clientWidth,
        height: container.clientHeight,
        backgroundColor: "#ffffff",
        preserveObjectStacking: true,
        selection: true,
      });
      fabricCanvasRef.current = canvas;

      canvas.on("selection:created", (e: any) => {
        const obj = e.selected?.[0];
        setSelectedObj(obj);
        syncFromObject(obj);
      });
      canvas.on("selection:updated", (e: any) => {
        const obj = e.selected?.[0];
        setSelectedObj(obj);
        syncFromObject(obj);
      });
      canvas.on("selection:cleared", () => {
        setSelectedObj(null);
        setSelectedType("");
      });

      canvas.on("object:added", () => {
        if (!isLoadingHistory.current) saveState();
        updateEmptyState();
      });
      canvas.on("object:modified", () => {
        if (!isLoadingHistory.current) saveState();
        const obj = canvas.getActiveObject();
        if (obj) syncFromObject(obj);
      });
      canvas.on("object:removed", () => {
        if (!isLoadingHistory.current) saveState();
        updateEmptyState();
      });

      saveState();
    };

    init();

    const handleResize = () => {
      const container = containerRef.current;
      const c = fabricCanvasRef.current;
      if (!container || !c) return;
      c.setDimensions({
        width: container.clientWidth,
        height: container.clientHeight,
      });
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      canvas?.dispose();
    };
  }, [saveState, updateEmptyState, syncFromObject]);

  // ─── Tool mode changes ────────────────────────────────────
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    const fabric = fabricModuleRef.current;
    if (!canvas || !fabric) return;

    canvas.isDrawingMode = activeTool === "draw";
    if (activeTool === "draw") {
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      canvas.freeDrawingBrush.color = strokeColor;
      canvas.freeDrawingBrush.width = brushWidth;
    }
    canvas.selection = activeTool === "select";
  }, [activeTool, strokeColor, brushWidth]);

  // ─── Keyboard shortcuts ───────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      const active = canvas.getActiveObject();
      if (active && active.isEditing) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelected();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "y" || (e.key === "z" && e.shiftKey))
      ) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  // ─── Object Actions ────────────────────────────────────────
  const deleteSelected = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const objs = canvas.getActiveObjects();
    if (objs.length === 0) return;
    objs.forEach((o: any) => canvas.remove(o));
    canvas.discardActiveObject();
    canvas.renderAll();
    setSelectedObj(null);
    setSelectedType("");
  };

  const clearCanvas = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    canvas.clear();
    canvas.backgroundColor = canvasBg;
    canvas.renderAll();
    saveState();
    setSelectedObj(null);
    setSelectedType("");
    setIsEmpty(true);
  };

  // ─── Add objects ───────────────────────────────────────────
  const addText = () => {
    const fabric = fabricModuleRef.current;
    const canvas = fabricCanvasRef.current;
    if (!fabric || !canvas) return;
    const text = new fabric.IText("Type here", {
      left: canvas.width! / 2 - 60,
      top: canvas.height! / 2 - 20,
      fontSize,
      fontFamily,
      fill: fillColor,
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    text.enterEditing();
    text.selectAll();
    setActiveTool("select");
  };

  const addRect = () => {
    const fabric = fabricModuleRef.current;
    const canvas = fabricCanvasRef.current;
    if (!fabric || !canvas) return;
    const rect = new fabric.Rect({
      left: canvas.width! / 2 - 60,
      top: canvas.height! / 2 - 40,
      width: 120,
      height: 80,
      fill: fillColor,
      stroke: strokeColor,
      strokeWidth,
      rx: 4,
      ry: 4,
    });
    canvas.add(rect);
    canvas.setActiveObject(rect);
    setActiveTool("select");
  };

  const addCircle = () => {
    const fabric = fabricModuleRef.current;
    const canvas = fabricCanvasRef.current;
    if (!fabric || !canvas) return;
    const circle = new fabric.Circle({
      left: canvas.width! / 2 - 40,
      top: canvas.height! / 2 - 40,
      radius: 40,
      fill: fillColor,
      stroke: strokeColor,
      strokeWidth,
    });
    canvas.add(circle);
    canvas.setActiveObject(circle);
    setActiveTool("select");
  };

  const addLine = () => {
    const fabric = fabricModuleRef.current;
    const canvas = fabricCanvasRef.current;
    if (!fabric || !canvas) return;
    const line = new fabric.Line(
      [
        canvas.width! / 2 - 60,
        canvas.height! / 2,
        canvas.width! / 2 + 60,
        canvas.height! / 2,
      ],
      {
        stroke: strokeColor,
        strokeWidth: Math.max(strokeWidth, 2),
      }
    );
    canvas.add(line);
    canvas.setActiveObject(line);
    setActiveTool("select");
  };

  // ─── Image Upload ──────────────────────────────────────────
  const loadImage = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const fabric = fabricModuleRef.current;
      const canvas = fabricCanvasRef.current;
      if (!fabric || !canvas) return;
      const url = e.target!.result as string;
      fabric.FabricImage.fromURL(url).then((img: any) => {
        const scale = Math.min(
          (canvas.width! * 0.8) / (img.width || 1),
          (canvas.height! * 0.8) / (img.height || 1),
          1
        );
        img.scale(scale);
        img.set({
          left: (canvas.width! - (img.width || 0) * scale) / 2,
          top: (canvas.height! - (img.height || 0) * scale) / 2,
        });
        canvas.add(img);
        canvas.setActiveObject(img);
        setIsEmpty(false);
      });
    };
    reader.readAsDataURL(file);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("image/")) loadImage(file);
    e.target.value = "";
  };

  // ─── Export ────────────────────────────────────────────────
  const exportAs = (format: "png" | "jpeg" | "svg") => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    canvas.discardActiveObject();
    canvas.renderAll();

    if (format === "svg") {
      const svg = canvas.toSVG();
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      download(url, `image.${format}`);
      URL.revokeObjectURL(url);
    } else {
      const url = canvas.toDataURL({
        format,
        quality: format === "jpeg" ? 0.92 : 1,
        multiplier: 2,
      });
      download(url, `image.${format}`);
    }
    setShowExport(false);
  };

  const download = (url: string, filename: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  };

  // ─── Property updaters ─────────────────────────────────────
  const updateProp = (prop: string, value: any) => {
    const canvas = fabricCanvasRef.current;
    const obj = canvas?.getActiveObject();
    if (!obj) return;
    obj.set(prop, value);
    canvas.renderAll();
    canvas.fire("object:modified", { target: obj });
  };

  const updateFill = (c: string) => {
    setFillColor(c);
    updateProp("fill", c);
  };
  const updateStroke = (c: string) => {
    setStrokeColor(c);
    updateProp("stroke", c);
  };
  const updateStrokeW = (w: number) => {
    setStrokeWidth(w);
    updateProp("strokeWidth", w);
  };
  const updateOpacity = (v: number) => {
    setOpacity(v);
    updateProp("opacity", v / 100);
  };
  const updateFontSize = (s: number) => {
    setFontSize(s);
    updateProp("fontSize", s);
  };
  const updateFontFamily = (f: string) => {
    setFontFamily(f);
    updateProp("fontFamily", f);
  };
  const toggleBold = () => {
    const next = !isBold;
    setIsBold(next);
    updateProp("fontWeight", next ? "bold" : "normal");
  };
  const toggleItalic = () => {
    const next = !isItalic;
    setIsItalic(next);
    updateProp("fontStyle", next ? "italic" : "normal");
  };
  const toggleUnderline = () => {
    const next = !isUnderline;
    setIsUnderline(next);
    updateProp("underline", next);
  };
  const updateTextAlign = (a: string) => {
    setTextAlign(a);
    updateProp("textAlign", a);
  };

  const updateCanvasBg = (c: string) => {
    setCanvasBg(c);
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    canvas.backgroundColor = c;
    canvas.renderAll();
  };

  // ─── Drag & Drop ───────────────────────────────────────────
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const onDragLeave = () => setIsDragOver(false);
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) loadImage(file);
  };

  // close export menu on outside click
  useEffect(() => {
    if (!showExport) return;
    const close = () => setShowExport(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [showExport]);

  // ─── Render ────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-[#0a0a0a] select-none">
      {/* ── Toolbar ────────────────────────────────────────── */}
      <div className="h-12 flex items-center justify-between px-3 border-b border-[#222] bg-[#111] shrink-0 z-10">
        {/* Left */}
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white transition-colors mr-4"
        >
          <ChevronLeft size={16} />
          <span className="font-medium">ToolKit</span>
        </Link>

        {/* Center tools */}
        <div className="flex items-center gap-0.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={onFileChange}
            className="hidden"
          />
          <ToolBtn
            icon={Upload}
            label="Upload Image"
            onClick={() => fileInputRef.current?.click()}
          />
          <Divider />
          <ToolBtn
            icon={MousePointer2}
            label="Select (V)"
            active={activeTool === "select"}
            onClick={() => setActiveTool("select")}
          />
          <ToolBtn icon={Type} label="Add Text (T)" onClick={addText} />
          <ToolBtn
            icon={Pencil}
            label="Draw (D)"
            active={activeTool === "draw"}
            onClick={() =>
              setActiveTool(activeTool === "draw" ? "select" : "draw")
            }
          />
          <Divider />
          <ToolBtn icon={Square} label="Rectangle" onClick={addRect} />
          <ToolBtn icon={Circle} label="Circle" onClick={addCircle} />
          <ToolBtn icon={Minus} label="Line" onClick={addLine} />
          <Divider />
          <ToolBtn
            icon={Undo2}
            label="Undo (Ctrl+Z)"
            onClick={undo}
            disabled={!canUndo}
          />
          <ToolBtn
            icon={Redo2}
            label="Redo (Ctrl+Y)"
            onClick={redo}
            disabled={!canRedo}
          />
          <Divider />
          <ToolBtn
            icon={Trash2}
            label="Delete"
            onClick={deleteSelected}
            disabled={!selectedObj}
            danger
          />
          <ToolBtn
            icon={RotateCcw}
            label="Clear Canvas"
            onClick={clearCanvas}
            disabled={isEmpty}
          />
        </div>

        {/* Right — Export */}
        <div className="relative ml-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowExport(!showExport);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
          >
            <Download size={15} />
            Export
          </button>
          {showExport && (
            <div
              className="absolute right-0 top-full mt-1 w-40 bg-[#1a1a1a] border border-[#333] rounded-lg shadow-xl py-1 z-50"
              onClick={(e) => e.stopPropagation()}
            >
              <ExportBtn label="PNG" onClick={() => exportAs("png")} />
              <ExportBtn label="JPEG" onClick={() => exportAs("jpeg")} />
              <ExportBtn label="SVG" onClick={() => exportAs("svg")} />
            </div>
          )}
        </div>
      </div>

      {/* ── Main area ──────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas container */}
        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden bg-[#1a1a1a]"
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <canvas ref={canvasElRef} />

          {/* Empty state overlay */}
          {isEmpty && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#252525] flex items-center justify-center">
                  <ImageIcon size={28} className="text-neutral-500" />
                </div>
                <p className="text-neutral-400 text-sm mb-1">
                  Drop an image here, or use the tools above
                </p>
                <p className="text-neutral-600 text-xs">
                  PNG, JPG, SVG, WebP supported
                </p>
                <button
                  className="mt-4 px-4 py-2 rounded-lg bg-[#252525] hover:bg-[#303030] text-sm text-neutral-300 transition-colors pointer-events-auto"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Upload Image
                </button>
              </div>
            </div>
          )}

          {/* Drag overlay */}
          {isDragOver && (
            <div className="absolute inset-4 border-2 border-dashed border-blue-500 rounded-xl bg-blue-500/5 flex items-center justify-center z-20">
              <p className="text-blue-400 text-lg font-medium">
                Drop image here
              </p>
            </div>
          )}
        </div>

        {/* ── Properties panel ──────────────────────────────── */}
        <div className="w-64 border-l border-[#222] bg-[#111] overflow-y-auto shrink-0">
          {/* Canvas section */}
          <PanelSection title="Canvas">
            <PropRow label="Background">
              <ColorSwatch color={canvasBg} onChange={updateCanvasBg} />
            </PropRow>
          </PanelSection>

          {/* Draw settings */}
          {activeTool === "draw" && (
            <PanelSection title="Brush">
              <PropRow label="Color">
                <ColorSwatch color={strokeColor} onChange={setStrokeColor} />
              </PropRow>
              <PropRow label="Size">
                <NumberInput
                  value={brushWidth}
                  onChange={(v) => {
                    setBrushWidth(v);
                    const canvas = fabricCanvasRef.current;
                    if (canvas?.freeDrawingBrush)
                      canvas.freeDrawingBrush.width = v;
                  }}
                  min={1}
                  max={100}
                />
              </PropRow>
            </PanelSection>
          )}

          {/* Object properties */}
          {selectedObj && selectedType === "text" && (
            <PanelSection title="Text">
              <PropRow label="Font">
                <select
                  value={fontFamily}
                  onChange={(e) => updateFontFamily(e.target.value)}
                  className="w-28 bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-xs text-white focus:border-blue-500 focus:outline-none"
                >
                  {FONTS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </PropRow>
              <PropRow label="Size">
                <NumberInput
                  value={fontSize}
                  onChange={updateFontSize}
                  min={8}
                  max={200}
                />
              </PropRow>
              <PropRow label="Color">
                <ColorSwatch color={fillColor} onChange={updateFill} />
              </PropRow>
              <PropRow label="Style">
                <div className="flex gap-0.5">
                  <ToggleBtn
                    icon={Bold}
                    active={isBold}
                    onClick={toggleBold}
                  />
                  <ToggleBtn
                    icon={Italic}
                    active={isItalic}
                    onClick={toggleItalic}
                  />
                  <ToggleBtn
                    icon={Underline}
                    active={isUnderline}
                    onClick={toggleUnderline}
                  />
                </div>
              </PropRow>
              <PropRow label="Align">
                <div className="flex gap-0.5">
                  <ToggleBtn
                    icon={AlignLeft}
                    active={textAlign === "left"}
                    onClick={() => updateTextAlign("left")}
                  />
                  <ToggleBtn
                    icon={AlignCenter}
                    active={textAlign === "center"}
                    onClick={() => updateTextAlign("center")}
                  />
                  <ToggleBtn
                    icon={AlignRight}
                    active={textAlign === "right"}
                    onClick={() => updateTextAlign("right")}
                  />
                </div>
              </PropRow>
            </PanelSection>
          )}

          {selectedObj &&
            (selectedType === "rectangle" ||
              selectedType === "circle" ||
              selectedType === "shape") && (
              <PanelSection title="Shape">
                <PropRow label="Fill">
                  <ColorSwatch color={fillColor} onChange={updateFill} />
                </PropRow>
                <PropRow label="Stroke">
                  <ColorSwatch color={strokeColor} onChange={updateStroke} />
                </PropRow>
                <PropRow label="Stroke W">
                  <NumberInput
                    value={strokeWidth}
                    onChange={updateStrokeW}
                    min={0}
                    max={50}
                  />
                </PropRow>
              </PanelSection>
            )}

          {selectedObj && (
            <PanelSection title="Transform">
              <PropRow label="Opacity">
                <div className="flex items-center gap-2 w-28">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={opacity}
                    onChange={(e) => updateOpacity(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-xs text-neutral-400 w-8 text-right tabular-nums">
                    {opacity}%
                  </span>
                </div>
              </PropRow>
              <div className="pt-2">
                <button
                  onClick={deleteSelected}
                  className="w-full py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium transition-colors"
                >
                  Delete Object
                </button>
              </div>
            </PanelSection>
          )}

          {!selectedObj && activeTool !== "draw" && (
            <div className="px-4 py-8 text-center">
              <p className="text-xs text-neutral-600">
                Select an object to edit its properties
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────

function ToolBtn({
  icon: Icon,
  label,
  active,
  disabled,
  danger,
  onClick,
}: {
  icon: React.ComponentType<{ size: number }>;
  label: string;
  active?: boolean;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`p-2 rounded-lg transition-all duration-150 ${
        disabled
          ? "text-neutral-700 cursor-not-allowed"
          : active
            ? "bg-blue-500/20 text-blue-400"
            : danger
              ? "text-neutral-400 hover:text-red-400 hover:bg-red-500/10"
              : "text-neutral-400 hover:text-neutral-200 hover:bg-white/5"
      }`}
    >
      <Icon size={17} />
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-[#333] mx-1" />;
}

function ExportBtn({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full px-3 py-1.5 text-left text-sm text-neutral-300 hover:bg-white/5 transition-colors"
    >
      Export as {label}
    </button>
  );
}

function PanelSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-4 py-3 border-b border-[#1e1e1e]">
      <h3 className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider mb-3">
        {title}
      </h3>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function PropRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-neutral-500 shrink-0">{label}</span>
      {children}
    </div>
  );
}

function ColorSwatch({
  color,
  onChange,
}: {
  color: string;
  onChange: (c: string) => void;
}) {
  return (
    <label className="relative cursor-pointer group">
      <div
        className="w-7 h-7 rounded-md border border-[#444] group-hover:border-[#666] transition-colors shadow-sm"
        style={{ backgroundColor: color }}
      />
      <input
        type="color"
        value={color}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
    </label>
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => {
        const v = Number(e.target.value);
        if (v >= min && v <= max) onChange(v);
      }}
      min={min}
      max={max}
      className="w-16 bg-[#1a1a1a] border border-[#333] rounded px-2 py-1 text-xs text-white text-center focus:border-blue-500 focus:outline-none tabular-nums"
    />
  );
}

function ToggleBtn({
  icon: Icon,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ size: number }>;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-1.5 rounded transition-colors ${
        active
          ? "bg-blue-500/20 text-blue-400"
          : "text-neutral-500 hover:text-neutral-300 hover:bg-white/5"
      }`}
    >
      <Icon size={14} />
    </button>
  );
}
