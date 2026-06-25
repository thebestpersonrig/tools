"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Search,
  Trash2,
  Clipboard,
  FileJson,
  Braces,
  Brackets,
} from "lucide-react";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

function JsonNode({
  keyName,
  value,
  depth,
  path,
  searchTerm,
  defaultExpanded,
}: {
  keyName?: string;
  value: JsonValue;
  depth: number;
  path: string;
  searchTerm: string;
  defaultExpanded: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);

  const isObject =
    value !== null && typeof value === "object" && !Array.isArray(value);
  const isArray = Array.isArray(value);
  const isExpandable = isObject || isArray;

  const entries = isObject
    ? Object.entries(value as Record<string, JsonValue>)
    : isArray
      ? (value as JsonValue[]).map((v, i) => [String(i), v] as const)
      : [];

  const matchesSearch =
    searchTerm &&
    (keyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (!isExpandable &&
        String(value).toLowerCase().includes(searchTerm.toLowerCase())));

  const copyValue = useCallback(() => {
    navigator.clipboard.writeText(
      typeof value === "string" ? value : JSON.stringify(value, null, 2)
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [value]);

  const renderValue = () => {
    if (value === null) return <span className="text-neutral-500">null</span>;
    if (typeof value === "boolean")
      return (
        <span className="text-amber-400">{value ? "true" : "false"}</span>
      );
    if (typeof value === "number")
      return <span className="text-emerald-400">{value}</span>;
    if (typeof value === "string") {
      const display = value.length > 120 ? value.slice(0, 120) + "…" : value;
      return <span className="text-sky-400">&quot;{display}&quot;</span>;
    }
    return null;
  };

  const preview = () => {
    if (isArray)
      return (
        <span className="text-neutral-500 text-xs ml-1">
          [{(value as JsonValue[]).length}]
        </span>
      );
    if (isObject)
      return (
        <span className="text-neutral-500 text-xs ml-1">
          {"{"}
          {Object.keys(value as Record<string, JsonValue>).length}
          {"}"}
        </span>
      );
    return null;
  };

  return (
    <div
      className={`${depth > 0 ? "ml-4 border-l border-[#222] pl-3" : ""}`}
    >
      <div
        className={`group flex items-center gap-1 py-[3px] rounded-md px-1.5 -mx-1.5 transition-colors ${
          matchesSearch
            ? "bg-amber-500/10 ring-1 ring-amber-500/30"
            : "hover:bg-[#1a1a1a]"
        }`}
      >
        {isExpandable ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-0.5 text-neutral-500 hover:text-white transition-colors shrink-0"
          >
            {expanded ? (
              <ChevronDown size={12} />
            ) : (
              <ChevronRight size={12} />
            )}
          </button>
        ) : (
          <span className="w-4" />
        )}

        {keyName !== undefined && (
          <>
            <span className="text-purple-400 text-sm shrink-0">
              {keyName}
            </span>
            <span className="text-neutral-600 text-sm mr-1">:</span>
          </>
        )}

        {isExpandable ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-sm text-neutral-300 hover:text-white transition-colors"
          >
            {isArray ? (
              <Brackets size={12} className="text-blue-400" />
            ) : (
              <Braces size={12} className="text-orange-400" />
            )}
            {!expanded && preview()}
          </button>
        ) : (
          <span className="text-sm break-all">{renderValue()}</span>
        )}

        <button
          onClick={copyValue}
          className="ml-auto p-1 rounded text-neutral-600 hover:text-white opacity-0 group-hover:opacity-100 transition-all shrink-0"
          title="Copy value"
        >
          {copied ? (
            <Check size={12} className="text-green-400" />
          ) : (
            <Copy size={12} />
          )}
        </button>
      </div>

      {isExpandable && expanded && (
        <div>
          {entries.map(([k, v]) => (
            <JsonNode
              key={k}
              keyName={k}
              value={v as JsonValue}
              depth={depth + 1}
              path={`${path}.${k}`}
              searchTerm={searchTerm}
              defaultExpanded={depth < 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function countNodes(value: JsonValue): { keys: number; values: number } {
  if (value === null || typeof value !== "object")
    return { keys: 0, values: 1 };
  const entries = Array.isArray(value)
    ? value.map((v, i) => [String(i), v] as const)
    : Object.entries(value);
  let keys = 0,
    values = 0;
  for (const [, v] of entries) {
    keys++;
    const sub = countNodes(v as JsonValue);
    keys += sub.keys;
    values += sub.values;
  }
  return { keys, values };
}

export default function JsonVisualizer() {
  const [input, setInput] = useState("");
  const [parsed, setParsed] = useState<JsonValue | undefined>(undefined);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedAll, setCopiedAll] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleParse = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) {
      setError("Paste some JSON first");
      return;
    }
    try {
      const result = JSON.parse(trimmed);
      setParsed(result);
      setError("");
    } catch (e: any) {
      setError(e.message || "Invalid JSON");
      setParsed(undefined);
    }
  }, [input]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInput(text);
      try {
        setParsed(JSON.parse(text.trim()));
        setError("");
      } catch {
        // just paste, user can press visualize
      }
    } catch {
      // clipboard access denied
    }
  }, []);

  const handleFormat = useCallback(() => {
    try {
      const formatted = JSON.stringify(JSON.parse(input.trim()), null, 2);
      setInput(formatted);
    } catch {
      // ignore if invalid
    }
  }, [input]);

  const handleMinify = useCallback(() => {
    try {
      const minified = JSON.stringify(JSON.parse(input.trim()));
      setInput(minified);
    } catch {
      // ignore
    }
  }, [input]);

  const copyFormatted = useCallback(() => {
    if (parsed === undefined) return;
    navigator.clipboard.writeText(JSON.stringify(parsed, null, 2));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1500);
  }, [parsed]);

  const stats = useMemo(() => {
    if (parsed === undefined) return null;
    return countNodes(parsed);
  }, [parsed]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleParse();
    }
  };

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
        <h1 className="text-sm font-semibold text-white">JSON Visualizer</h1>
      </div>

      <div className="flex-1 max-w-5xl w-full mx-auto px-6 py-8">
        {parsed === undefined ? (
          /* Input mode */
          <div className="space-y-4">
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder='Paste your JSON here...\n\n{"name": "example", "items": [1, 2, 3]}'
                className="w-full h-80 bg-[#141414] border border-[#222] rounded-xl p-4 text-sm text-white font-mono placeholder-neutral-600 focus:border-blue-500 focus:outline-none resize-none"
                spellCheck={false}
              />
              {error && (
                <div className="absolute bottom-3 left-3 right-3 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                  {error}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleParse}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
              >
                <FileJson size={15} />
                Visualize
              </button>
              <button
                onClick={handlePaste}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#222] hover:bg-[#2a2a2a] text-neutral-300 text-sm transition-colors"
              >
                <Clipboard size={14} />
                Paste from clipboard
              </button>
              <button
                onClick={handleFormat}
                className="px-4 py-2.5 rounded-xl bg-[#222] hover:bg-[#2a2a2a] text-neutral-300 text-sm transition-colors"
              >
                Format
              </button>
              <button
                onClick={handleMinify}
                className="px-4 py-2.5 rounded-xl bg-[#222] hover:bg-[#2a2a2a] text-neutral-300 text-sm transition-colors"
              >
                Minify
              </button>
              <span className="text-xs text-neutral-600 ml-auto">
                Ctrl + Enter to visualize
              </span>
            </div>

            {/* Sample JSON */}
            <div className="pt-4">
              <p className="text-xs text-neutral-600 mb-2">
                Or try a sample:
              </p>
              <div className="flex gap-2 flex-wrap">
                {[
                  {
                    label: "Simple object",
                    json: '{"name":"John Doe","age":30,"active":true,"tags":["developer","designer"],"address":{"city":"New York","zip":"10001"}}',
                  },
                  {
                    label: "Array of objects",
                    json: '[{"id":1,"title":"Hello World","published":true},{"id":2,"title":"Second Post","published":false},{"id":3,"title":"Draft","published":null}]',
                  },
                  {
                    label: "Nested data",
                    json: '{"company":"Acme Inc","departments":[{"name":"Engineering","teams":[{"name":"Frontend","members":3},{"name":"Backend","members":5}]},{"name":"Design","teams":[{"name":"UI/UX","members":2}]}],"metadata":{"founded":2020,"public":false}}',
                  },
                ].map((sample) => (
                  <button
                    key={sample.label}
                    onClick={() => {
                      const formatted = JSON.stringify(
                        JSON.parse(sample.json),
                        null,
                        2
                      );
                      setInput(formatted);
                      setParsed(JSON.parse(sample.json));
                      setError("");
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#181818] border border-[#222] text-xs text-neutral-400 hover:text-white hover:border-[#444] transition-colors"
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Tree view */
          <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center gap-2 p-3 bg-[#141414] border border-[#222] rounded-xl flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500"
                />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search keys & values..."
                  className="w-full bg-[#1a1a1a] border border-[#333] rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder-neutral-600 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <button
                onClick={copyFormatted}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#222] hover:bg-[#2a2a2a] text-neutral-300 text-sm transition-colors"
              >
                {copiedAll ? (
                  <Check size={14} className="text-green-400" />
                ) : (
                  <Copy size={14} />
                )}
                Copy
              </button>

              <button
                onClick={() => {
                  setParsed(undefined);
                  setSearchTerm("");
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#222] hover:bg-[#2a2a2a] text-neutral-300 text-sm transition-colors"
              >
                <Trash2 size={14} />
                Clear
              </button>
            </div>

            {/* Stats */}
            {stats && (
              <div className="flex gap-4 text-xs text-neutral-500">
                <span>
                  {stats.keys} key{stats.keys !== 1 ? "s" : ""}
                </span>
                <span>
                  {stats.values} value{stats.values !== 1 ? "s" : ""}
                </span>
                <span>
                  {new Blob([JSON.stringify(parsed)]).size.toLocaleString()} bytes
                </span>
              </div>
            )}

            {/* Tree */}
            <div className="bg-[#141414] border border-[#222] rounded-xl p-4 font-mono overflow-x-auto max-h-[calc(100vh-240px)] overflow-y-auto">
              <JsonNode
                value={parsed}
                depth={0}
                path="$"
                searchTerm={searchTerm}
                defaultExpanded={true}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
