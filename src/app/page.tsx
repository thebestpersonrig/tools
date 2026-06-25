import Link from "next/link";
import {
  Braces,
  Code2,
  GitCompareArrows,
  Database,
  Captions,
  Scissors,
  Film,
  Calculator,
  Share2,
  Search,
  Clock,
  Unlink,
  FileText,
  ArrowRight,
  Sparkles,
} from "lucide-react";

const categories: Record<string, string> = {
  Media: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  Developer: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  Student: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  Internet: "text-orange-400 bg-orange-400/10 border-orange-400/20",
  Document: "text-rose-400 bg-rose-400/10 border-rose-400/20",
};

const tools = [
  // ── Live ──
  {
    name: "PDF Tools",
    icon: FileText,
    description: "Merge, split, rotate, edit, and organize PDFs",
    href: "/tools/pdf-tools",
    category: "Document",
    available: true,
  },
  // ── Coming soon ──
  {
    name: "JSON Visualizer",
    icon: Braces,
    description: "Paste JSON and explore it as an interactive tree or graph",
    href: "/tools/json-visualizer",
    category: "Developer",
    available: false,
  },
  {
    name: "Regex Playground",
    icon: Code2,
    description: "Test regex patterns in real-time with match highlighting",
    href: "/tools/regex-playground",
    category: "Developer",
    available: false,
  },
  {
    name: "Git Diff Viewer",
    icon: GitCompareArrows,
    description: "Compare files and folders with a clean diff interface",
    href: "/tools/git-diff",
    category: "Developer",
    available: false,
  },
  {
    name: "SQL Query Builder",
    icon: Database,
    description: "Build SQL queries visually with drag-and-drop",
    href: "/tools/sql-builder",
    category: "Developer",
    available: false,
  },
  {
    name: "Subtitle Editor",
    icon: Captions,
    description: "Upload .srt files and edit timings visually",
    href: "/tools/subtitle-editor",
    category: "Media",
    available: false,
  },
  {
    name: "Audio Trimmer",
    icon: Scissors,
    description: "Cut and trim MP3 files right in your browser",
    href: "/tools/audio-trimmer",
    category: "Media",
    available: false,
  },
  {
    name: "Video Compressor",
    icon: Film,
    description: "Compress videos with quality and size controls",
    href: "/tools/video-compressor",
    category: "Media",
    available: false,
  },
  {
    name: "Formula Sheet",
    icon: Calculator,
    description: "Enter formulas and generate a printable cheat-sheet PDF",
    href: "/tools/formula-sheet",
    category: "Student",
    available: false,
  },
  {
    name: "Temp Share Links",
    icon: Share2,
    description: "Upload text or files that self-destruct after viewing",
    href: "/tools/temp-share",
    category: "Internet",
    available: false,
  },
  {
    name: "Link Inspector",
    icon: Search,
    description: "View metadata, OG tags, redirects, DNS, and SSL info",
    href: "/tools/link-inspector",
    category: "Internet",
    available: false,
  },
  {
    name: "Timezone Visualizer",
    icon: Clock,
    description: "Compare multiple timezones at a glance",
    href: "/tools/timezone",
    category: "Internet",
    available: false,
  },
  {
    name: "Dead Link Scanner",
    icon: Unlink,
    description: "Scan any website and find all broken links",
    href: "/tools/dead-links",
    category: "Internet",
    available: false,
  },
];

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5" />
        <div className="relative max-w-6xl mx-auto px-6 py-24 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-surface text-sm text-muted mb-6">
            <Sparkles size={14} className="text-accent" />
            All tools run in your browser — your data never leaves
          </div>
          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Toolium
            </span>
          </h1>
        </div>
      </section>

      {/* Tools Grid */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const catClass = categories[tool.category];

            if (!tool.available) {
              return (
                <div
                  key={tool.name}
                  className="relative p-5 rounded-xl border border-border bg-surface opacity-50 cursor-default"
                >
                  <CardContent
                    Icon={Icon}
                    catClass={catClass}
                    tool={tool}
                    available={false}
                  />
                </div>
              );
            }

            return (
              <Link
                key={tool.name}
                href={tool.href}
                className="group relative p-5 rounded-xl border border-border bg-surface transition-all duration-200 hover:border-neutral-700 hover:bg-[#181818] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20"
              >
                <CardContent
                  Icon={Icon}
                  catClass={catClass}
                  tool={tool}
                  available={true}
                />
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function CardContent({
  Icon,
  catClass,
  tool,
  available,
}: {
  Icon: React.ComponentType<{ size: number }>;
  catClass: string;
  tool: { name: string; description: string; category: string };
  available: boolean;
}) {
  return (
    <>
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2 rounded-lg border ${catClass}`}>
          <Icon size={18} />
        </div>
        <span
          className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${catClass}`}
        >
          {tool.category}
        </span>
      </div>
      <h3 className="text-[15px] font-semibold mb-1">{tool.name}</h3>
      <p className="text-sm text-muted leading-relaxed">{tool.description}</p>
      {available ? (
        <div className="mt-3 flex items-center gap-1 text-sm font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity">
          Open tool <ArrowRight size={14} />
        </div>
      ) : (
        <div className="mt-3 text-xs text-muted">Coming soon</div>
      )}
    </>
  );
}
