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
  mode?: "normal" | "incident";
  focusNodeId?: string | null;
  height?: number;
  className?: string;
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
  if (node.is_router) return 18;
  const portCount = Object.keys(node.open_ports || {}).length;
  return Math.max(8, Math.min(15, 8 + portCount * 1.1));
}

export default function NetworkGraph({
  data,
  onNodeClick,
  onNodeHover,
  pulsingNodes,
  suspiciousNodes,
  attackLinkKeys,
  mode = "normal",
  focusNodeId,
  height = 560,
  className = "",
}: NetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const renderGraph = useCallback(() => {
    if (!data || !svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = containerRef.current.clientWidth;
    const graphHeight = Math.max(420, height);
    svg.attr("width", width).attr("height", graphHeight);

    const defs = svg.append("defs");

    const blur = defs.append("filter").attr("id", "node-glow");
    blur.append("feGaussianBlur").attr("stdDeviation", "3.2").attr("result", "blur");
    blur
      .append("feMerge")
      .selectAll("feMergeNode")
      .data(["blur", "SourceGraphic"])
      .join("feMergeNode")
      .attr("in", (d) => d);

    const g = svg.append("g");
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.42, 4.4])
      .on("zoom", (event) => g.attr("transform", event.transform));
    svg.call(zoom);

    const nodes: SimNode[] = data.nodes.map((node) => ({ ...node }));
    const links: SimLink[] = data.edges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      key: edgeKey(edge.source, edge.target),
    }));

    const isSuspicious = (node: TopologyNode) => Boolean(suspiciousNodes?.has(node.id)) || node.risk_score >= 65;

    const simulation = d3
      .forceSimulation<SimNode>(nodes)
      .force(
        "link",
        d3
          .forceLink<SimNode, SimLink>(links)
          .id((d) => d.id)
          .distance((link) => {
            const src = link.source as SimNode;
            const dst = link.target as SimNode;
            const hot = attackLinkKeys?.has(edgeKey(src.id, dst.id));
            return hot ? 102 : 138;
          })
      )
      .force("charge", d3.forceManyBody().strength(-320))
      .force("center", d3.forceCenter(width / 2, graphHeight / 2))
      .force("collision", d3.forceCollide<SimNode>().radius((d) => nodeRadius(d) + 17));

    const linkLayer = g.append("g");
    const baseLinks = linkLayer
      .selectAll<SVGLineElement, SimLink>("line")
      .data(links)
      .join("line")
      .attr("class", (d) => (attackLinkKeys?.has(d.key) ? "network-link-flow network-link-hot" : "network-link-flow"))
      .attr("stroke", (d) => (attackLinkKeys?.has(d.key) ? "var(--status-critical)" : "rgba(56, 141, 192, 0.5)"))
      .attr("stroke-width", (d) => (attackLinkKeys?.has(d.key) ? 2.5 : 1.3))
      .attr("stroke-opacity", (d) => {
        if (mode === "incident") {
          return attackLinkKeys?.has(d.key) ? 0.95 : 0.16;
        }
        return attackLinkKeys?.has(d.key) ? 0.86 : 0.5;
      });

    const nodeLayer = g.append("g");

    const halos = nodeLayer
      .selectAll<SVGCircleElement, SimNode>("circle.halo")
      .data(nodes)
      .join("circle")
      .attr("r", (d) => nodeRadius(d) + 9)
      .attr("fill", (d) => (isSuspicious(d) ? "var(--status-critical)" : "var(--status-info)"))
      .attr("opacity", (d) => {
        if (mode === "incident") return isSuspicious(d) ? 0.28 : 0.05;
        return isSuspicious(d) ? 0.16 : 0.09;
      })
      .attr("filter", "url(#node-glow)");

    const pulseTargets = nodes.filter((node) => isSuspicious(node) || Boolean(pulsingNodes?.has(node.id)));
    const pulseRings = nodeLayer
      .selectAll<SVGCircleElement, SimNode>("circle.pulse")
      .data(pulseTargets)
      .join("circle")
      .attr("r", (d) => nodeRadius(d) + 2)
      .attr("fill", "none")
      .attr("stroke", (d) => (isSuspicious(d) ? "var(--status-critical)" : "var(--status-info)"))
      .attr("stroke-width", 1.8)
      .attr("stroke-opacity", mode === "incident" ? 0.8 : 0.5);

    function animatePulses() {
      pulseRings
        .attr("r", (d) => nodeRadius(d) + 1)
        .attr("stroke-opacity", mode === "incident" ? 0.9 : 0.55)
        .transition()
        .duration(mode === "incident" ? 1200 : 1700)
        .ease(d3.easeLinear)
        .attr("r", (d) => nodeRadius(d) + 21)
        .attr("stroke-opacity", 0)
        .on("end", animatePulses);
    }

    if (pulseTargets.length > 0) animatePulses();

    const nodesSelection = nodeLayer
      .selectAll<SVGCircleElement, SimNode>("circle.node")
      .data(nodes)
      .join("circle")
      .attr("r", (d) => nodeRadius(d))
      .attr("fill", (d) => {
        if (isSuspicious(d)) return "var(--status-critical)";
        if (d.is_router) return "var(--status-info)";
        return getRiskColor(d.risk_score);
      })
      .attr("stroke", "rgba(8, 15, 26, 0.9)")
      .attr("stroke-width", 2.6)
      .attr("opacity", (d) => {
        if (mode === "incident") {
          if (isSuspicious(d)) return 1;
          if (focusNodeId && d.id === focusNodeId) return 1;
          return 0.3;
        }
        return 1;
      })
      .style("cursor", "pointer")
      .on("click", (_, d) => onNodeClick(d))
      .on("mouseenter", function (_, d) {
        onNodeHover?.(d);
        d3.select(this).transition().duration(120).attr("r", nodeRadius(d) + 2.4);
      })
      .on("mouseleave", function (_, d) {
        onNodeHover?.(null);
        d3.select(this).transition().duration(120).attr("r", nodeRadius(d));
      });

    const drag = d3
      .drag<SVGCircleElement, SimNode>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.25).restart();
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
      .attr("fill", "rgba(175, 194, 212, 0.84)")
      .attr("text-anchor", "middle")
      .attr("dy", (d) => (d.is_router ? 30 : 24))
      .attr("opacity", (d) => (mode === "incident" && !isSuspicious(d) ? 0.38 : 0.86))
      .style("pointer-events", "none");

    let focusApplied = false;

    simulation.on("tick", () => {
      baseLinks
        .attr("x1", (d) => (d.source as SimNode).x ?? 0)
        .attr("y1", (d) => (d.source as SimNode).y ?? 0)
        .attr("x2", (d) => (d.target as SimNode).x ?? 0)
        .attr("y2", (d) => (d.target as SimNode).y ?? 0);

      halos.attr("cx", (d) => d.x ?? 0).attr("cy", (d) => d.y ?? 0);
      pulseRings.attr("cx", (d) => d.x ?? 0).attr("cy", (d) => d.y ?? 0);
      nodesSelection.attr("cx", (d) => d.x ?? 0).attr("cy", (d) => d.y ?? 0);
      labels.attr("x", (d) => d.x ?? 0).attr("y", (d) => d.y ?? 0);

      if (!focusApplied && mode === "incident" && focusNodeId) {
        const focusNode = nodes.find((node) => node.id === focusNodeId);
        if (focusNode && focusNode.x !== undefined && focusNode.y !== undefined) {
          focusApplied = true;
          const scale = 1.42;
          const tx = width / 2 - focusNode.x * scale;
          const ty = graphHeight / 2 - focusNode.y * scale;
          svg
            .transition()
            .duration(750)
            .call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
        }
      }
    });

    return () => simulation.stop();
  }, [attackLinkKeys, data, focusNodeId, height, mode, onNodeClick, onNodeHover, pulsingNodes, suspiciousNodes]);

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
      <div className={`overflow-hidden rounded-[16px] border border-[var(--border-soft)] ${className}`} style={{ height }}>
        <div className="w-full h-full flex flex-col items-center justify-center gap-4">
          <div className="w-11 h-11 rounded-full border-2 border-[var(--status-info)] border-t-transparent animate-spin" />
          <p className="text-xs uppercase tracking-[0.16em]" style={{ color: "var(--text-ghost)", fontFamily: "var(--font-mono)" }}>
            awaiting telemetry stream
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`overflow-hidden rounded-[16px] border border-[var(--border-soft)] ${className}`}
      style={{
        height,
        background:
          mode === "incident"
            ? "radial-gradient(120% 130% at 52% 55%, rgba(255,80,101,0.08) 0%, rgba(7,12,20,0.9) 52%), #050a12"
            : "radial-gradient(120% 130% at 50% 50%, rgba(39,141,197,0.08) 0%, rgba(7,12,20,0.9) 52%), #050a12",
      }}
    >
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
}
