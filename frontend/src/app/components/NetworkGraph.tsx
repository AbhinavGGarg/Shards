"use client";

import { useRef, useEffect, useCallback } from "react";
import * as d3 from "d3";
import type { TopologyData, TopologyNode } from "@/lib/api";
import { getRiskColor } from "./RiskScoreBadge";

interface NetworkGraphProps {
  data: TopologyData | null;
  onNodeClick: (node: TopologyNode) => void;
  onNodeHover?: (node: TopologyNode | null) => void;
  pulsingNodes?: Set<string>;
  suspiciousNodes?: Set<string>;
  attackLinkKeys?: Set<string>;
}

interface SimNode extends d3.SimulationNodeDatum, TopologyNode {}
interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  source: SimNode | string;
  target: SimNode | string;
  key: string;
}

function edgeKey(a: string, b: string): string {
  return [a, b].sort().join("::");
}

function nodeRadius(node: TopologyNode): number {
  if (node.is_router) return 19;
  const portCount = Object.keys(node.open_ports || {}).length;
  return Math.max(9, Math.min(15, 9 + portCount * 1.15));
}

export default function NetworkGraph({
  data,
  onNodeClick,
  onNodeHover,
  pulsingNodes,
  suspiciousNodes,
  attackLinkKeys,
}: NetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const renderGraph = useCallback(() => {
    if (!data || !svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = containerRef.current.clientWidth;
    const height = Math.max(500, containerRef.current.clientHeight || 500);
    svg.attr("width", width).attr("height", height);

    const defs = svg.append("defs");

    const bgGradient = defs.append("linearGradient").attr("id", "graph-bg").attr("x1", "0%").attr("y1", "0%").attr("x2", "100%").attr("y2", "100%");
    bgGradient.append("stop").attr("offset", "0%").attr("stop-color", "#0b1321").attr("stop-opacity", 0.95);
    bgGradient.append("stop").attr("offset", "100%").attr("stop-color", "#070c16").attr("stop-opacity", 1);

    const blur = defs.append("filter").attr("id", "node-glow");
    blur.append("feGaussianBlur").attr("stdDeviation", "3").attr("result", "blur");
    blur
      .append("feMerge")
      .selectAll("feMergeNode")
      .data(["blur", "SourceGraphic"])
      .join("feMergeNode")
      .attr("in", (d) => d);

    svg
      .append("rect")
      .attr("width", width)
      .attr("height", height)
      .attr("fill", "url(#graph-bg)");

    const g = svg.append("g");
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.45, 4])
      .on("zoom", (event) => g.attr("transform", event.transform));
    svg.call(zoom);

    for (let x = 0; x < width; x += 42) {
      g.append("line")
        .attr("x1", x)
        .attr("x2", x)
        .attr("y1", 0)
        .attr("y2", height)
        .attr("stroke", "rgba(56, 90, 120, 0.08)")
        .attr("stroke-width", 0.8);
    }

    for (let y = 0; y < height; y += 42) {
      g.append("line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", y)
        .attr("y2", y)
        .attr("stroke", "rgba(56, 90, 120, 0.08)")
        .attr("stroke-width", 0.8);
    }

    const nodes: SimNode[] = data.nodes.map((node) => ({ ...node }));
    const links: SimLink[] = data.edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      key: edgeKey(edge.source, edge.target),
    }));

    const isSuspicious = (node: TopologyNode) =>
      Boolean(suspiciousNodes?.has(node.id)) || node.risk_score >= 65;

    const simulation = d3
      .forceSimulation<SimNode>(nodes)
      .force(
        "link",
        d3.forceLink<SimNode, SimLink>(links).id((d) => d.id).distance((link) => {
          const src = link.source as SimNode;
          const dst = link.target as SimNode;
          const hot = attackLinkKeys?.has(edgeKey(src.id, dst.id));
          return hot ? 110 : 145;
        })
      )
      .force("charge", d3.forceManyBody().strength(-360))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide<SimNode>().radius((d) => nodeRadius(d) + 18));

    const linkLayer = g.append("g");
    const baseLinks = linkLayer
      .selectAll<SVGLineElement, SimLink>("line.base")
      .data(links)
      .join("line")
      .attr("class", (d) => {
        const hot = attackLinkKeys?.has(d.key);
        return hot ? "network-link-flow network-link-hot" : "network-link-flow";
      })
      .attr("stroke", (d) => (attackLinkKeys?.has(d.key) ? "var(--status-critical)" : "rgba(53, 121, 162, 0.45)"))
      .attr("stroke-width", (d) => (attackLinkKeys?.has(d.key) ? 2.5 : 1.4))
      .attr("stroke-opacity", (d) => (attackLinkKeys?.has(d.key) ? 0.9 : 0.55));

    const nodeLayer = g.append("g");

    const halos = nodeLayer
      .selectAll<SVGCircleElement, SimNode>("circle.halo")
      .data(nodes)
      .join("circle")
      .attr("class", "node-halo")
      .attr("r", (d) => nodeRadius(d) + 8)
      .attr("fill", (d) => (isSuspicious(d) ? "var(--status-critical)" : "var(--status-info)"))
      .attr("opacity", (d) => (isSuspicious(d) ? 0.18 : 0.11))
      .attr("filter", "url(#node-glow)");

    const pulseTargets = nodes.filter((node) => isSuspicious(node) || Boolean(pulsingNodes?.has(node.id)));
    const pulseRings = nodeLayer
      .selectAll<SVGCircleElement, SimNode>("circle.pulse")
      .data(pulseTargets)
      .join("circle")
      .attr("class", "alert-ring")
      .attr("r", (d) => nodeRadius(d) + 2)
      .attr("fill", "none")
      .attr("stroke", (d) => (isSuspicious(d) ? "var(--status-critical)" : "var(--status-info)"))
      .attr("stroke-width", 1.8)
      .attr("stroke-opacity", 0.65);

    function animatePulses() {
      pulseRings
        .attr("r", (d) => nodeRadius(d) + 2)
        .attr("stroke-opacity", 0.72)
        .transition()
        .duration(1500)
        .ease(d3.easeLinear)
        .attr("r", (d) => nodeRadius(d) + 22)
        .attr("stroke-opacity", 0)
        .on("end", animatePulses);
    }
    if (pulseTargets.length > 0) animatePulses();

    const nodesSelection = nodeLayer
      .selectAll<SVGCircleElement, SimNode>("circle.node")
      .data(nodes)
      .join("circle")
      .attr("class", "node-core")
      .attr("r", (d) => nodeRadius(d))
      .attr("fill", (d) => {
        if (isSuspicious(d)) return "var(--status-critical)";
        if (d.is_router) return "var(--status-info)";
        return getRiskColor(d.risk_score);
      })
      .attr("stroke", "rgba(8, 15, 26, 0.9)")
      .attr("stroke-width", 2.6)
      .style("cursor", "pointer")
      .on("click", (_, d) => onNodeClick(d))
      .on("mouseenter", function (_, d) {
        onNodeHover?.(d);
        d3.select(this).transition().duration(120).attr("r", nodeRadius(d) + 2.5);
      })
      .on("mouseleave", function (_, d) {
        onNodeHover?.(null);
        d3.select(this).transition().duration(120).attr("r", nodeRadius(d));
      });

    const drag = d3
      .drag<SVGCircleElement, SimNode>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.2).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });
    nodesSelection.call(drag);

    const labels = nodeLayer
      .selectAll<SVGTextElement, SimNode>("text")
      .data(nodes)
      .join("text")
      .text((d) => d.hostname || d.ip)
      .attr("font-size", 10)
      .attr("font-family", "var(--font-mono)")
      .attr("fill", "rgba(175, 194, 212, 0.86)")
      .attr("text-anchor", "middle")
      .attr("dy", (d) => (d.is_router ? 30 : 25))
      .style("pointer-events", "none");

    simulation.on("tick", () => {
      baseLinks
        .attr("x1", (d) => (d.source as SimNode).x ?? 0)
        .attr("y1", (d) => (d.source as SimNode).y ?? 0)
        .attr("x2", (d) => (d.target as SimNode).x ?? 0)
        .attr("y2", (d) => (d.target as SimNode).y ?? 0);

      halos
        .attr("cx", (d) => d.x ?? 0)
        .attr("cy", (d) => d.y ?? 0);

      pulseRings
        .attr("cx", (d) => d.x ?? 0)
        .attr("cy", (d) => d.y ?? 0);

      nodesSelection
        .attr("cx", (d) => d.x ?? 0)
        .attr("cy", (d) => d.y ?? 0);

      labels
        .attr("x", (d) => d.x ?? 0)
        .attr("y", (d) => d.y ?? 0);
    });

    return () => simulation.stop();
  }, [attackLinkKeys, data, onNodeClick, onNodeHover, pulsingNodes, suspiciousNodes]);

  useEffect(() => {
    renderGraph();
  }, [renderGraph]);

  useEffect(() => {
    const handleResize = () => renderGraph();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [renderGraph]);

  if (!data || data.nodes.length === 0) {
    return (
      <div className="command-panel h-[520px] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-[var(--status-info)] border-t-transparent animate-spin" />
        <p className="text-xs uppercase tracking-[0.18em]" style={{ color: "var(--text-ghost)", fontFamily: "var(--font-mono)" }}>
          Awaiting telemetry — run scan to map attack surface
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="command-panel overflow-hidden h-[520px]">
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
}
