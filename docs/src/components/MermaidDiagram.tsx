import { useEffect, useId, useState } from "react";
import mermaid from "mermaid";

interface MermaidDiagramProps {
  chart: string;
}

mermaid.initialize({
  startOnLoad: false,
  theme: "neutral",
  securityLevel: "loose",
});

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const id = useId().replace(/:/g, "-");
  const [svg, setSvg] = useState("");

  useEffect(() => {
    let mounted = true;
    mermaid.render(`mermaid-${id}`, chart).then(({ svg: rendered }) => {
      if (mounted) {
        setSvg(rendered);
      }
    });

    return () => {
      mounted = false;
    };
  }, [chart, id]);

  return (
    <div className="overflow-x-auto rounded-lg border border-white/10 bg-white/95 p-4 shadow-[0_20px_60px_rgba(7,17,14,0.18)]">
      {svg ? <div dangerouslySetInnerHTML={{ __html: svg }} /> : <pre className="text-sm text-slate-700">{chart}</pre>}
    </div>
  );
}
