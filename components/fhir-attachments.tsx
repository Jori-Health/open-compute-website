'use client'

import { Button } from '@/components/ui/button'
import { generateId } from 'ai'
import { ChevronDown, ChevronRight, Download } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface FHIRMetadata {
  type: 'fhir-metadata'
  bundleJson?: string
  graphData?: {
    nodes: any[]
    edges: any[]
    mermaid: string
    stats: {
      total_resources: number
      total_relationships: number
      resource_types: string[]
    }
  }
  patientId: string
}

interface FHIRAttachmentsProps {
  metadata: FHIRMetadata
}

export function FHIRAttachments({ metadata }: FHIRAttachmentsProps) {
  // Don't render anything if there's no valid data
  if (!metadata || (!metadata.bundleJson && !metadata.graphData)) {
    return null
  }

  return (
    <div className="mt-6 space-y-4">
      {metadata.graphData && <FHIRGraph graphData={metadata.graphData} />}
      {metadata.bundleJson && (
        <>
          <FHIRDownloadButton
            bundleJson={metadata.bundleJson}
            patientId={metadata.patientId}
          />
          <FHIRRawDataViewer
            bundleJson={metadata.bundleJson}
            graphData={metadata.graphData}
          />
        </>
      )}
    </div>
  )
}

function FHIRGraph({ graphData }: { graphData: FHIRMetadata['graphData'] }) {
  const mermaidRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!graphData || !mermaidRef.current) return

    const renderDiagram = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Dynamically import mermaid
        const mermaid = (await import('mermaid')).default
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          securityLevel: 'loose'
        })

        const id = `mermaid-${generateId()}`
        const { svg } = await mermaid.render(id, graphData.mermaid)

        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = svg
        }
      } catch (err) {
        console.error('Mermaid rendering error:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    renderDiagram()
  }, [graphData])

  if (!graphData) return null

  return (
    <div className="border border-neutral-700 rounded-lg overflow-hidden bg-neutral-800">
      <div className="bg-neutral-700 px-4 py-2 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">
            📊 Resource Relationship Graph
          </h3>
          <p className="text-xs text-neutral-300">
            {graphData.stats.total_resources} resources,{' '}
            {graphData.stats.total_relationships} relationships
          </p>
        </div>
      </div>
      <div className="p-6 bg-neutral-800">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        )}
        {error && (
          <div className="text-red-400 text-sm p-4 bg-red-900/20 rounded">
            Error rendering diagram: {error}
          </div>
        )}
        <div
          ref={mermaidRef}
          className="flex items-center justify-center overflow-x-auto"
          style={{ display: isLoading || error ? 'none' : 'flex' }}
        />
      </div>
    </div>
  )
}

function FHIRDownloadButton({
  bundleJson,
  patientId
}: {
  bundleJson: string
  patientId: string
}) {
  const handleDownload = () => {
    const blob = new Blob([bundleJson], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `fhir-bundle-${patientId}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="border border-neutral-700 rounded-lg overflow-hidden bg-neutral-800">
      <div className="bg-neutral-700 px-4 py-2">
        <h3 className="text-sm font-semibold text-white">
          💾 Download FHIR Bundle
        </h3>
      </div>
      <div className="p-4">
        <p className="text-sm text-neutral-300 mb-3">
          Download the complete FHIR Bundle as a JSON file.
        </p>
        <Button
          onClick={handleDownload}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Download className="w-4 h-4 mr-2" />
          Download FHIR Bundle JSON
        </Button>
      </div>
    </div>
  )
}

function FHIRRawDataViewer({
  bundleJson,
  graphData
}: {
  bundleJson: string
  graphData?: FHIRMetadata['graphData']
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [parsedBundle, setParsedBundle] = useState<any>(null)

  useEffect(() => {
    try {
      const parsed = JSON.parse(bundleJson)
      setParsedBundle(parsed)
    } catch (error) {
      console.error('Failed to parse bundle JSON:', error)
    }
  }, [bundleJson])

  if (!parsedBundle) return null

  return (
    <div className="border border-neutral-700 rounded-lg overflow-hidden bg-neutral-800">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full bg-neutral-700 px-4 py-2 flex items-center justify-between hover:bg-neutral-600 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-white" />
          ) : (
            <ChevronRight className="w-4 h-4 text-white" />
          )}
          <h3 className="text-sm font-semibold text-white">
            🔍 View Raw Data Structure
          </h3>
        </div>
        <span className="text-xs text-neutral-300">
          {isExpanded ? 'Click to collapse' : 'Click to expand'}
        </span>
      </button>
      {isExpanded && (
        <div className="p-4 max-h-[600px] overflow-auto">
          <div className="space-y-4">
            {/* Bundle JSON Section */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-xs">
                  FHIR Bundle
                </span>
                <span className="text-neutral-400 text-xs">
                  {parsedBundle.entry?.length || 0} resources
                </span>
              </h4>
              <div className="bg-neutral-900 rounded-lg p-4 overflow-x-auto">
                <pre className="text-xs text-neutral-300 whitespace-pre-wrap">
                  {JSON.stringify(parsedBundle, null, 2)}
                </pre>
              </div>
            </div>

            {/* Graph Data Section */}
            {graphData && (
              <div>
                <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                  <span className="bg-purple-600 text-white px-2 py-0.5 rounded text-xs">
                    Graph Data
                  </span>
                  <span className="text-neutral-400 text-xs">
                    {graphData.nodes?.length || 0} nodes,{' '}
                    {graphData.edges?.length || 0} edges
                  </span>
                </h4>
                <div className="bg-neutral-900 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-xs text-neutral-300 whitespace-pre-wrap">
                    {JSON.stringify(graphData, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Resource Type Summary */}
            {parsedBundle.entry && (
              <div>
                <h4 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                  <span className="bg-green-600 text-white px-2 py-0.5 rounded text-xs">
                    Resource Summary
                  </span>
                </h4>
                <div className="bg-neutral-900 rounded-lg p-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {Object.entries(
                      parsedBundle.entry.reduce((acc: any, entry: any) => {
                        const type = entry.resource?.resourceType || 'Unknown'
                        acc[type] = (acc[type] || 0) + 1
                        return acc
                      }, {})
                    ).map(([type, count]) => (
                      <div
                        key={type}
                        className="bg-neutral-800 px-3 py-2 rounded border border-neutral-700"
                      >
                        <div className="text-xs font-semibold text-white">
                          {type}
                        </div>
                        <div className="text-xs text-neutral-400">
                          {count} resource{count !== 1 ? 's' : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
