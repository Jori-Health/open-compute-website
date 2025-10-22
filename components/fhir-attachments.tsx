'use client'

import { useEffect, useRef, useState } from 'react'

import { generateId } from 'ai'
import { ChevronDown, ChevronRight, Download } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface FHIRMetadata {
  type: 'fhir-metadata'
  bundleJson?: any
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
  hasFhirBundle?: boolean // Flag that bundle exists but wasn't sent in stream
  chatId?: string
}

interface FHIRAttachmentsProps {
  metadata: FHIRMetadata
}

export function FHIRAttachments({ metadata }: FHIRAttachmentsProps) {
  console.log('[FHIRAttachments] Metadata received:', metadata)
  console.log('[FHIRAttachments] Bundle JSON present:', !!metadata?.bundleJson)
  console.log('[FHIRAttachments] Graph Data present:', !!metadata?.graphData)
  console.log(
    '[FHIRAttachments] Has FHIR Bundle flag:',
    metadata?.hasFhirBundle
  )

  // Don't render anything if there's no valid data
  if (
    !metadata ||
    (!metadata.bundleJson && !metadata.graphData && !metadata.hasFhirBundle)
  ) {
    console.log('[FHIRAttachments] No valid data to render')
    return null
  }

  console.log('[FHIRAttachments] Rendering components...')

  return (
    <div className="mt-4 sm:mt-6 space-y-3 sm:space-y-4">
      {metadata.graphData && <FHIRGraph graphData={metadata.graphData} />}
      {/* Show message if bundle wasn't sent in stream */}
      {metadata.hasFhirBundle && !metadata.bundleJson && (
        <div className="border border-blue-700 rounded-lg overflow-hidden bg-blue-900/20">
          <div className="bg-blue-700 px-3 sm:px-4 py-2">
            <h3 className="text-xs sm:text-sm font-semibold text-white">
              💾 FHIR Bundle Saved
            </h3>
          </div>
          <div className="p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-blue-300">
              The FHIR bundle was generated and saved successfully. You can view
              and download it by navigating to this chat from your history.
            </p>
          </div>
        </div>
      )}
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

  console.log('[FHIRGraph] Rendering graph component')
  console.log('[FHIRGraph] Graph data available:', !!graphData)
  console.log('[FHIRGraph] Graph has mermaid:', !!graphData?.mermaid)

  useEffect(() => {
    if (!graphData || !mermaidRef.current) {
      console.log('[FHIRGraph] Missing graphData or mermaidRef')
      return
    }

    console.log('[FHIRGraph] Starting diagram render')

    const renderDiagram = async () => {
      try {
        setIsLoading(true)
        setError(null)

        console.log('[FHIRGraph] Importing mermaid')
        // Dynamically import mermaid
        const mermaid = (await import('mermaid')).default
        mermaid.initialize({
          startOnLoad: false,
          theme: 'dark',
          securityLevel: 'loose'
        })

        console.log('[FHIRGraph] Rendering mermaid diagram')
        const id = `mermaid-${generateId()}`
        const { svg } = await mermaid.render(id, graphData.mermaid)

        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = svg
          console.log('[FHIRGraph] Diagram rendered successfully')
        }
      } catch (err) {
        console.error('[FHIRGraph] Mermaid rendering error:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    renderDiagram()
  }, [graphData])

  if (!graphData) {
    console.log('[FHIRGraph] No graph data, returning null')
    return null
  }

  return (
    <div className="border border-neutral-700 rounded-lg overflow-hidden bg-neutral-800">
      <div className="bg-neutral-700 px-3 sm:px-4 py-2 flex items-center justify-between">
        <div>
          <h3 className="text-xs sm:text-sm font-semibold text-white">
            📊 Resource Relationship Graph
          </h3>
          <p className="text-xs text-neutral-300">
            {graphData.stats.total_resources} resources,{' '}
            {graphData.stats.total_relationships} relationships
          </p>
        </div>
      </div>
      <div className="p-3 sm:p-6 bg-neutral-800">
        {isLoading && (
          <div className="flex items-center justify-center py-6 sm:py-8">
            <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-white"></div>
          </div>
        )}
        {error && (
          <div className="text-red-400 text-xs sm:text-sm p-3 sm:p-4 bg-red-900/20 rounded">
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
  console.log('[FHIRDownloadButton] Rendering download button')
  console.log('[FHIRDownloadButton] Patient ID:', patientId)
  console.log(
    '[FHIRDownloadButton] Bundle JSON available:',
    !!bundleJson,
    'type:',
    typeof bundleJson
  )

  const handleDownload = () => {
    console.log('[FHIRDownloadButton] Download initiated')
    try {
      // Handle both string and object types
      const jsonString =
        typeof bundleJson === 'string'
          ? bundleJson
          : JSON.stringify(bundleJson, null, 2)

      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `fhir-bundle-${patientId}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      console.log('[FHIRDownloadButton] Download complete')
    } catch (error) {
      console.error('[FHIRDownloadButton] Download failed:', error)
    }
  }

  return (
    <div className="border border-neutral-700 rounded-lg overflow-hidden bg-neutral-800">
      <div className="bg-neutral-700 px-3 sm:px-4 py-2">
        <h3 className="text-xs sm:text-sm font-semibold text-white">
          💾 Download FHIR Bundle
        </h3>
      </div>
      <div className="p-3 sm:p-4">
        <p className="text-xs sm:text-sm text-neutral-300 mb-3">
          Download the complete FHIR Bundle as a JSON file.
        </p>
        <Button
          onClick={handleDownload}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm h-9 sm:h-10"
        >
          <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2" />
          <span className="text-xs sm:text-sm">Download FHIR Bundle JSON</span>
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
  const [parseError, setParseError] = useState<string | null>(null)

  useEffect(() => {
    try {
      console.log('[FHIRRawDataViewer] Attempting to parse bundle JSON')
      console.log('[FHIRRawDataViewer] Bundle JSON type:', typeof bundleJson)
      console.log(
        '[FHIRRawDataViewer] Bundle JSON length:',
        bundleJson?.length || 'N/A'
      )

      // If bundleJson is already an object, use it directly
      if (typeof bundleJson === 'object') {
        console.log('[FHIRRawDataViewer] Bundle JSON is already an object')
        setParsedBundle(bundleJson)
        setParseError(null)
      } else if (typeof bundleJson === 'string') {
        console.log('[FHIRRawDataViewer] Parsing bundle JSON string')
        const parsed = JSON.parse(bundleJson)
        setParsedBundle(parsed)
        setParseError(null)
        console.log('[FHIRRawDataViewer] Successfully parsed bundle JSON')
      } else {
        throw new Error(`Unexpected bundle JSON type: ${typeof bundleJson}`)
      }
    } catch (error) {
      console.error('[FHIRRawDataViewer] Failed to parse bundle JSON:', error)
      setParseError(
        error instanceof Error ? error.message : 'Unknown parse error'
      )
    }
  }, [bundleJson])

  if (parseError) {
    return (
      <div className="border border-red-700 rounded-lg overflow-hidden bg-red-900/20">
        <div className="bg-red-700 px-3 sm:px-4 py-2">
          <h3 className="text-xs sm:text-sm font-semibold text-white">
            ❌ Error Parsing FHIR Data
          </h3>
        </div>
        <div className="p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-red-300">{parseError}</p>
        </div>
      </div>
    )
  }

  if (!parsedBundle) {
    return (
      <div className="border border-neutral-700 rounded-lg overflow-hidden bg-neutral-800">
        <div className="bg-neutral-700 px-3 sm:px-4 py-2">
          <h3 className="text-xs sm:text-sm font-semibold text-white">
            🔄 Loading FHIR Data...
          </h3>
        </div>
      </div>
    )
  }

  return (
    <div className="border border-neutral-700 rounded-lg overflow-hidden bg-neutral-800">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full bg-neutral-700 px-3 sm:px-4 py-2 flex items-center justify-between hover:bg-neutral-600 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
          )}
          <h3 className="text-xs sm:text-sm font-semibold text-white">
            🔍 View Raw Data Structure
          </h3>
        </div>
        <span className="text-xs text-neutral-300 hidden sm:inline">
          {isExpanded ? 'Click to collapse' : 'Click to expand'}
        </span>
      </button>
      {isExpanded && (
        <div className="p-3 sm:p-4 max-h-[400px] sm:max-h-[600px] overflow-auto">
          <div className="space-y-3 sm:space-y-4">
            {/* Bundle JSON Section */}
            <div>
              <h4 className="text-xs sm:text-sm font-semibold text-white mb-2 flex items-center gap-2 flex-wrap">
                <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-xs">
                  FHIR Bundle
                </span>
                <span className="text-neutral-400 text-xs">
                  {parsedBundle.entry?.length || 0} resources
                </span>
              </h4>
              <div className="bg-neutral-900 rounded-lg p-3 sm:p-4 overflow-x-auto">
                <pre className="text-xs text-neutral-300 whitespace-pre-wrap">
                  {JSON.stringify(parsedBundle, null, 2)}
                </pre>
              </div>
            </div>

            {/* Graph Data Section */}
            {graphData && (
              <div>
                <h4 className="text-xs sm:text-sm font-semibold text-white mb-2 flex items-center gap-2 flex-wrap">
                  <span className="bg-purple-600 text-white px-2 py-0.5 rounded text-xs">
                    Graph Data
                  </span>
                  <span className="text-neutral-400 text-xs">
                    {graphData.nodes?.length || 0} nodes,{' '}
                    {graphData.edges?.length || 0} edges
                  </span>
                </h4>
                <div className="bg-neutral-900 rounded-lg p-3 sm:p-4 overflow-x-auto">
                  <pre className="text-xs text-neutral-300 whitespace-pre-wrap">
                    {JSON.stringify(graphData, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Resource Type Summary */}
            {parsedBundle.entry && (
              <div>
                <h4 className="text-xs sm:text-sm font-semibold text-white mb-2 flex items-center gap-2">
                  <span className="bg-green-600 text-white px-2 py-0.5 rounded text-xs">
                    Resource Summary
                  </span>
                </h4>
                <div className="bg-neutral-900 rounded-lg p-3 sm:p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {Object.entries(
                      parsedBundle.entry.reduce((acc: any, entry: any) => {
                        const type = entry.resource?.resourceType || 'Unknown'
                        acc[type] = (acc[type] || 0) + 1
                        return acc
                      }, {})
                    ).map(([type, count]) => (
                      <div
                        key={type}
                        className="bg-neutral-800 px-2 sm:px-3 py-2 rounded border border-neutral-700"
                      >
                        <div className="text-xs font-semibold text-white">
                          {type}
                        </div>
                        <div className="text-xs text-neutral-400">
                          {count as number} resource
                          {(count as number) !== 1 ? 's' : ''}
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
