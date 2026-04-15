"use client";

import { useRef, useEffect, useCallback } from "react";
import * as d3 from "d3";
import type { TopologyData, TopologyNode, TopologyEdge } from "@/lib/api";
import { getRiskColor } from "./RiskScoreBadge";

interface NetworkGraphProps {
  data: TopologyData | null;
  onNodeClick: (node: TopologyNode) => void;
  pulsingNodes?: Set<string>;
}

interface SimNode extends d3.SimulationNodeDatum, TopologyNode {}
interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  source: SimNode | string;
  target: SimNode | string;
}

export default function NetworkGraph({ data, onNodeClick, pulsingNodes }: NetworkGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const renderGraph = useCallback(() => {
    if (!data || !svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight || 500;

    svg.attr("width", width).attr("height", height);

    // Pulse animation definition
    const defs = svg.append("defs");
    const pulseFilter = defs.append("filter").attr("id", "pulse-glow");
    pulseFilter.append("feGaussianBlur").attr("stdDeviation", "3").attr("result", "blur");
    pulseFilter
      .append("feMerge")
      .selectAll("feMergeNode")
      .data(["blur", "SourceGraphic"])
      .join("feMergeNode")
      .attr("in", (d) => d);

    // Create zoom group
    const g = svg.append("g");
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 5])
      .on("zoom", (event) => g.attr("transform", event.transform));
    svg.call(zoom);

    // Prepare data
    const nodes: SimNode[] = data.nodes.map((n) => ({ ...n }));
    const links: SimLink[] = data.edges.map((e) => ({
      source: e.source,
      target: e.target,
    }));

    // Force simulation
    const simulation = d3
      .forceSimulation<SimNode>(nodes)
      .force("link", d3.forceLink<SimNode, SimLink>(links).id((d) => d.id).distance(120))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(30));

    // Draw edges
    const link = g
      .append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "var(--bg-border)")
      .attr("stroke-width", 1)
      .attr("stroke-opacity", 0.4);

    // Draw pulse rings for new devices
    const pulseRings = g
      .append("g")
      .selectAll<SVGCircleElement, SimNode>("circle")
      .data(nodes.filter((n) => pulsingNodes?.has(n.id)))
      .join("circle")
      .attr("r", 20)
      .attr("fill", "none")
      .attr("stroke", (d) => getRiskColor(d.risk_score))
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.8)
      .attr("filter", "url(#pulse-glow)");

    // Animate pulse rings
    function animatePulse() {
      pulseRings
        .attr("r", 10)
        .attr("stroke-opacity", 0.8)
        .transition()
        .duration(1500)
        .ease(d3.easeLinear)
        .attr("r", 30)
        .attr("stroke-opacity", 0)
        .on("end", animatePulse);
    }
    if (pulsingNodes && pulsingNodes.size > 0) {
      animatePulse();
    }

    // Draw nodes
    const node = g
      .append("g")
      .selectAll<SVGCircleElement, SimNode>("circle")
      .data(nodes)
      .join("circle")
      .attr("r", (d) => {
        if (d.is_router) return 20;
        const portCount = Object.keys(d.open_ports || {}).length;
        return Math.max(8, Math.min(16, 8 + portCount * 1.5));
      })
      .attr("fill", (d) => getRiskColor(d.risk_score))
      .attr("stroke", "var(--bg-deep)")
      .attr("stroke-width", 2.5)
      .style("cursor", "pointer")
      .on("click", (_, d) => onNodeClick(d));

    // Drag behavior
    const drag = d3.drag<SVGCircleElement, SimNode>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
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
    node.call(drag);

    // Labels
    const labels = g
      .append("g")
      .selectAll("text")
      .data(nodes)
      .join("text")
      .text((d) => d.hostname || d.ip)
      .attr("font-size", 10)
      .attr("font-family", "var(--font-mono)")
      .attr("fill", "var(--text-ghost)")
      .attr("text-anchor", "middle")
      .attr("dy", (d) => (d.is_router ? 30 : 24))
      .style("pointer-events", "none");

    // Tick update
    simulation.on("tick", () => {
      link
        .attr("x1", (d) => (d.source as SimNode).x!)
        .attr("y1", (d) => (d.source as SimNode).y!)
        .attr("x2", (d) => (d.target as SimNode).x!)
        .attr("y2", (d) => (d.target as SimNode).y!);
      node.attr("cx", (d) => d.x!).attr("cy", (d) => d.y!);
      labels.attr("x", (d) => d.x!).attr("y", (d) => d.y!);
      pulseRings.attr("cx", (d) => d.x!).attr("cy", (d) => d.y!);
    });

    return () => simulation.stop();
  }, [data, onNodeClick, pulsingNodes]);

  useEffect(() => {
    renderGraph();
  }, [renderGraph]);

  // Re-render on resize
  useEffect(() => {
    const handleResize = () => renderGraph();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [renderGraph]);

  if (!data || data.nodes.length === 0) {
    return (
      <div
        className="flex items-center justify-center h-96 rounded-xl"
        style={{
          background: "var(--bg-card)",
          border: "1px solid color-mix(in srgb, var(--bg-border) 30%, transparent)",
        }}
      >
        <p
          style={{
            color: "var(--text-ghost)",
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          No network data — run a scan to map the terrain.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="rounded-xl overflow-hidden"
      style={{
        background: "var(--bg-card)",
        border: "1px solid color-mix(in srgb, var(--bg-border) 30%, transparent)",
        height: "500px",
      }}
    >
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
}
