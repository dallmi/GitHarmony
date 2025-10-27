import React, { useRef, useEffect, useMemo } from 'react'
import * as d3 from 'd3'
import { buildDependencyGraph } from '../utils/dependencyUtils'
import { isBlocked } from '../utils/labelUtils'

export default function DependencyGraphView({ issues }) {
  const svgRef = useRef(null)

  const graphData = useMemo(() => {
    return buildDependencyGraph(issues)
  }, [issues])

  useEffect(() => {
    if (!svgRef.current || graphData.nodes.length === 0) return

    const width = svgRef.current.clientWidth
    const height = 600

    // Clear previous graph
    d3.select(svgRef.current).selectAll('*').remove()

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)

    // Add arrowhead marker
    svg.append('defs').append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .append('svg:path')
      .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
      .attr('fill', '#9CA3AF')

    // Create simulation
    const simulation = d3.forceSimulation(graphData.nodes)
      .force('link', d3.forceLink(graphData.links).id(d => d.id).distance(150))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(40))

    // Create links
    const link = svg.append('g')
      .selectAll('path')
      .data(graphData.links)
      .enter()
      .append('path')
      .attr('fill', 'none')
      .attr('stroke', '#9CA3AF')
      .attr('stroke-width', 2)
      .attr('marker-end', 'url(#arrowhead)')

    // Create nodes
    const node = svg.append('g')
      .selectAll('g')
      .data(graphData.nodes)
      .enter()
      .append('g')
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended))

    node.append('circle')
      .attr('r', 20)
      .attr('fill', d => {
        if (isBlocked(d.labels)) return '#DC2626'
        if (d.state === 'closed') return '#059669'
        return '#2563EB'
      })
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')

    node.append('text')
      .attr('dy', -25)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('font-weight', '500')
      .attr('fill', '#1F2937')
      .text(d => `#${d.id}`)

    node.append('title')
      .text(d => `#${d.id}: ${d.title}`)

    // Update positions on tick
    simulation.on('tick', () => {
      link.attr('d', d => {
        const dx = d.target.x - d.source.x
        const dy = d.target.y - d.source.y
        const dr = Math.sqrt(dx * dx + dy * dy)
        return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`
      })

      node.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      d.fx = d.x
      d.fy = d.y
    }

    function dragged(event, d) {
      d.fx = event.x
      d.fy = event.y
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0)
      d.fx = null
      d.fy = null
    }

    return () => {
      simulation.stop()
    }
  }, [graphData])

  if (graphData.nodes.length === 0) {
    return (
      <div className="container">
        <div className="card text-center" style={{ padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>○ ― ○</div>
          <h3 className="mb-2">No Dependencies Found</h3>
          <p className="text-muted">
            Add "blocked by #123" or "depends on #123" to issue descriptions to create dependencies.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="container">
      <div className="card mb-3">
        <h2 className="mb-3">Dependency Graph</h2>

        <div style={{ display: 'flex', gap: '24px', marginBottom: '24px', fontSize: '13px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#2563EB' }}></div>
            <span className="text-muted">In Progress</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#059669' }}></div>
            <span className="text-muted">Completed</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#DC2626' }}></div>
            <span className="text-muted">Blocker</span>
          </div>
        </div>

        <svg ref={svgRef} style={{ width: '100%', border: '1px solid var(--border-light)', borderRadius: '4px' }}></svg>
      </div>

      <div className="card">
        <h3 className="mb-3">Statistics</h3>
        <div className="grid grid-3">
          <div className="text-center">
            <div style={{ fontSize: '32px', fontWeight: '700' }}>{graphData.nodes.length}</div>
            <div className="metric-label">TOTAL ISSUES</div>
          </div>
          <div className="text-center">
            <div style={{ fontSize: '32px', fontWeight: '700' }}>{graphData.links.length}</div>
            <div className="metric-label">DEPENDENCIES</div>
          </div>
          <div className="text-center">
            <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--danger)' }}>
              {graphData.nodes.filter(n => isBlocked(n.labels)).length}
            </div>
            <div className="metric-label">BLOCKING</div>
          </div>
        </div>
      </div>
    </div>
  )
}
