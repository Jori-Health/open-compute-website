import { groq } from '@ai-sdk/groq'
import { createServerClient } from '@supabase/ssr'
import { generateText, StreamData, streamText } from 'ai'
import { cookies } from 'next/headers'

import { getChat } from '@/lib/actions/chat'
import { getCurrentUserId } from '@/lib/auth/get-current-user'
import { convertToCoreMessages } from 'ai'

export const maxDuration = 300 // 5 minutes - max for Vercel Enterprise

// Handle OPTIONS request for CORS preflight
export async function OPTIONS(req: Request) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400' // 24 hours
    }
  })
}

interface JourneyStage {
  name: string
  description: string
  metadata?: Record<string, any>
}

interface PatientJourneyPayload {
  patient_id: string
  summary: string
  stages: JourneyStage[]
  patient_context?: string
  fhir_version?: string
  model?: string
  max_iterations?: number
}

export async function POST(req: Request) {
  try {
    const { messages, id: chatId, userId: passedUserId } = await req.json()
    // Use passed userId if available (from forwarded request), otherwise get from session
    const userId = passedUserId || (await getCurrentUserId())

    console.log('🔍 OpenCompute Agent - User ID:', userId)
    console.log(
      '💾 Save enabled:',
      process.env.ENABLE_SAVE_CHAT_HISTORY === 'true'
    )

    const dataWarehouseUrl =
      process.env.NEXT_PUBLIC_DATA_WAREHOUSE_URL || 'http://localhost:5050'

    // Get the user's last message
    const userMessage = messages[messages.length - 1]?.content || ''

    // Use OpenAI to extract patient journey information from the user's message
    const extractionPrompt = `You are a medical data extraction assistant. Extract patient journey information from the following text and format it as a structured JSON object.

The JSON should have this structure:
{
  "patient_id": "string (generate a unique ID if not provided)",
  "summary": "string (brief summary of the patient's journey)",
  "stages": [
    {
      "name": "string (e.g., Registration, Triage, Diagnosis, Treatment, Procedure)",
      "description": "string (detailed description)",
      "metadata": {
        // Any relevant metadata like timestamps, vital signs, medications, etc.
      }
    }
  ],
  "patient_context": "string (patient demographics, history, etc.)"
}

User input:
${userMessage}

Extract the information and return ONLY valid JSON. If the input doesn't contain enough information for a complete patient journey, create a reasonable interpretation based on what's provided.`

    const extraction = await generateText({
      model: groq('openai/gpt-oss-120b'),
      prompt: extractionPrompt
    })

    let journeyData: PatientJourneyPayload
    try {
      const extractedText = extraction.text || ''
      // Try to extract JSON from the response
      const jsonMatch = extractedText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in extraction response')
      }
      journeyData = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error('Failed to parse extracted journey data:', parseError)
      // Fallback: create a simple journey from the user message
      journeyData = {
        patient_id: `patient-${Date.now()}`,
        summary: userMessage.substring(0, 200),
        stages: [
          {
            name: 'Clinical Visit',
            description: userMessage,
            metadata: {
              timestamp: new Date().toISOString()
            }
          }
        ],
        patient_context: 'Patient information extracted from user query'
      }
    }

    // Call the data warehouse OpenCompute endpoint
    console.log('='.repeat(80))
    console.log('🌐 CALLING DATA WAREHOUSE')
    console.log(`   URL: ${dataWarehouseUrl}/opencompute/generate-fhir-from-patient-journey`)
    console.log(`   Patient ID: ${journeyData.patient_id}`)
    console.log(`   Stages: ${journeyData.stages.length}`)
    console.log(`   Payload size: ${JSON.stringify(journeyData).length} bytes`)
    console.log('='.repeat(80))
    
    const startTime = Date.now()

    let response: Response
    try {
      response = await fetch(
        `${dataWarehouseUrl}/opencompute/generate-fhir-from-patient-journey`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(journeyData),
          signal: AbortSignal.timeout(270000) // 4.5 minutes (increased)
        }
      )
    } catch (fetchError) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2)
      console.log('='.repeat(80))
      console.error(`❌ FETCH ERROR (after ${duration}s)`)
      console.error(`   Error type: ${fetchError instanceof Error ? fetchError.name : 'Unknown'}`)
      console.error(`   Error message: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`)
      console.error(`   Data warehouse URL: ${dataWarehouseUrl}`)
      console.log('='.repeat(80))
      throw fetchError
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)
    console.log('='.repeat(80))
    console.log(`✅ BACKEND RESPONSE RECEIVED (${duration}s)`)
    console.log(`   Status: ${response.status} ${response.statusText}`)
    console.log(`   Content-Type: ${response.headers.get('content-type')}`)
    console.log(`   Generation-Time: ${response.headers.get('X-Generation-Time')}s`)
    console.log(`   Resource-Count: ${response.headers.get('X-Resource-Count')}`)
    console.log('='.repeat(80))

    if (!response.ok) {
      const errorText = await response.text()
      console.log('='.repeat(80))
      console.error(`❌ BACKEND ERROR RESPONSE`)
      console.error(`   Status: ${response.status} ${response.statusText}`)
      console.error(`   Error body (first 500 chars):`)
      console.error(`   ${errorText.substring(0, 500)}`)
      console.log('='.repeat(80))
      throw new Error(
        `Data warehouse API error: ${response.status} - ${errorText}`
      )
    }

    const fhirResult = await response.json()
    console.log(
      `✅ Backend response received successfully (${duration}s total)`
    )
    console.log(
      '📦 Response contains:',
      'bundle:',
      !!fhirResult.bundle_json,
      'graph:',
      !!fhirResult.graph_data,
      'resources:',
      fhirResult.generated_resources?.length || 0
    )

    // Log the raw backend response for debugging
    console.log('='.repeat(80))
    console.log('RAW BACKEND RESPONSE - Patient Journey to FHIR')
    console.log('='.repeat(80))
    console.log('Full response structure:')
    console.log(JSON.stringify(fhirResult, null, 2))
    console.log('='.repeat(80))

    // Format the response WITHOUT graph and download sections
    const formattedResponse = formatFHIRResponse(fhirResult, journeyData)

    // Create stream data for metadata
    const data = new StreamData()

    // Send metadata if we have resources generated (even if validation failed)
    // Check for actual data existence, not just success status
    if (
      (fhirResult.bundle_json && fhirResult.bundle_json !== null) ||
      (fhirResult.graph_data && fhirResult.graph_data !== null)
    ) {
      console.log(
        'Sending FHIR metadata:',
        'bundle:',
        !!fhirResult.bundle_json,
        'graph:',
        !!fhirResult.graph_data
      )

      try {
        // ⚠️ TEMPORARY FIX: Don't send the large bundle_json in stream
        // It's already saved to DB and storage, users can load it from there
        const streamMetadata = {
          type: 'fhir-metadata',
          bundleJson: null, // Don't send large bundle in stream
          graphData: fhirResult.graph_data, // Send graph data (smaller)
          patientId: journeyData.patient_id,
          hasFhirBundle: !!fhirResult.bundle_json, // Flag that bundle exists
          chatId: chatId // Add chat ID so frontend can fetch if needed
        }

        console.log('📦 Streaming metadata (bundle excluded)')
        console.log('   - Has graph data:', !!streamMetadata.graphData)
        console.log('   - Has FHIR bundle:', streamMetadata.hasFhirBundle)
        console.log('   - Patient ID:', streamMetadata.patientId)

        data.append(streamMetadata)
        console.log('✅ FHIR metadata appended to stream')
      } catch (appendError) {
        console.error(
          '❌ Error appending FHIR metadata to stream:',
          appendError
        )
        // Continue anyway - data is saved to DB
      }
    } else {
      console.log('No FHIR metadata to send - no resources generated')
    }

    // Stream the response back
    const result = streamText({
      model: groq('openai/gpt-oss-120b'),
      messages: [
        {
          role: 'system',
          content: `You are to summarize in a short paragraph, the success or failure of the generation of FHIR resources from the users request. Their request was: ${userMessage}`
        },
        {
          role: 'user',
          content: formattedResponse
        }
      ],
      async onFinish(result) {
        data.close()

        // Save chat to database if enabled
        if (
          process.env.ENABLE_SAVE_CHAT_HISTORY === 'true' &&
          userId !== 'anonymous'
        ) {
          try {
            const coreMessages = convertToCoreMessages(messages)

            // Get existing chat or create new one
            const savedChat = (await getChat(chatId, userId)) ?? {
              messages: [],
              createdAt: new Date(),
              userId: userId,
              path: `/search/${chatId}`,
              title: messages[0]?.content || 'Patient Journey to FHIR',
              id: chatId,
              sharePath: undefined
            }

            // Create the complete message history including the new response
            const updatedMessages = [
              ...coreMessages,
              ...result.response.messages
            ]

            // Add FHIR metadata as a data annotation BEFORE the last assistant message
            // This ensures convertToUIMessages will attach it as an annotation
            if (fhirResult.bundle_json || fhirResult.graph_data) {
              // Find the last assistant message index
              const lastAssistantIndex = updatedMessages.length - 1

              // Insert the data message right before the last assistant message
              // so convertToUIMessages will pick it up as a pending annotation
              const dataMessage = {
                role: 'data',
                content: {
                  type: 'fhir-metadata',
                  bundleJson: fhirResult.bundle_json,
                  graphData: fhirResult.graph_data,
                  patientId: journeyData.patient_id
                }
              } as any

              console.log('📦 Inserting FHIR metadata before assistant message')
              updatedMessages.splice(lastAssistantIndex, 0, dataMessage)
            }

            // Create a Supabase client with the user's session for saving
            const cookieStore = await cookies()
            const supabase = createServerClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL!,
              process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
              {
                cookies: {
                  getAll() {
                    return cookieStore.getAll()
                  },
                  setAll(cookiesToSet) {
                    try {
                      cookiesToSet.forEach(({ name, value, options }) =>
                        cookieStore.set(name, value, options)
                      )
                    } catch {}
                  }
                }
              }
            )

            // Prepare chat data
            const chatData = {
              id: chatId,
              title: messages[0]?.content || 'Patient Journey to FHIR',
              user_id: userId,
              path: `/search/${chatId}`,
              messages: updatedMessages,
              share_path: savedChat.sharePath || null,
              model_id: 'patient-journey-to-fhir',
              model_name: 'Patient Journey to FHIR',
              model_provider: 'Jori Agents',
              provider_id: 'jori-agents',
              created_at:
                savedChat.createdAt?.toISOString() || new Date().toISOString()
            }

            // Save directly with authenticated client
            const { error } = await supabase.from('chats').upsert(chatData, {
              onConflict: 'id',
              ignoreDuplicates: false
            })

            if (error) {
              console.error('❌ Supabase error:', error)
              throw error
            }

            console.log(
              '✅ Chat saved successfully to Supabase with FHIR metadata'
            )

            // Save FHIR bundle to Supabase storage if it exists
            if (fhirResult.bundle_json) {
              try {
                const bundleFileName = `${journeyData.patient_id}_${chatId}.json`
                const bundlePath = `fhir-bundles/${userId}/${bundleFileName}`

                const { error: uploadError } = await supabase.storage
                  .from('fhir-resources')
                  .upload(bundlePath, fhirResult.bundle_json, {
                    contentType: 'application/json',
                    upsert: true
                  })

                if (uploadError) {
                  console.error(
                    '❌ Failed to save FHIR bundle to storage:',
                    uploadError
                  )
                } else {
                  console.log(`✅ FHIR bundle saved to storage: ${bundlePath}`)
                }
              } catch (storageError) {
                console.error(
                  '❌ Error saving FHIR bundle to storage:',
                  storageError
                )
              }
            }
          } catch (saveError) {
            console.error('❌ Failed to save chat:', saveError)
          }
        } else if (userId === 'anonymous') {
          console.log('⚠️ Skipping save - user is anonymous')
        } else {
          console.log('⚠️ Skipping save - ENABLE_SAVE_CHAT_HISTORY not enabled')
        }
      }
    })

    return result.toDataStreamResponse({ data })
  } catch (error) {
    console.error('OpenCompute agent error:', error)
    console.error(
      'Error stack:',
      error instanceof Error ? error.stack : 'No stack trace'
    )

    // Determine if this is a timeout error
    const isTimeout =
      error instanceof Error &&
      (error.name === 'AbortError' || error.message.includes('timeout'))

    // Return error as a stream with helpful message
    const errorMessage = isTimeout
      ? `The backend request timed out while generating FHIR resources. This usually happens when processing complex patient journeys. The data may still be saved - please check your chat history.`
      : `There was an error generating FHIR resources: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or rephrase your request.`

    return streamText({
      model: groq('openai/gpt-oss-120b'),
      prompt: errorMessage
    }).toDataStreamResponse()
  }
}

function formatFHIRResponse(
  result: any,
  journeyData: PatientJourneyPayload
): string {
  let output = `# Patient Journey to FHIR Generation Results\n\n`

  output += `## Patient Information\n`
  output += `- **Patient ID**: ${journeyData.patient_id}\n`
  output += `- **Summary**: ${journeyData.summary}\n\n`

  output += `## Generation Status\n`
  output += `- **Success**: ${result.success ? '✅ Yes' : result.generated_resources?.length > 0 ? '⚠️ Partial (with validation errors)' : '❌ No'}\n`
  output += `- **Iterations**: ${result.iterations}\n`
  output += `- **Resources Generated**: ${result.generated_resources?.length || 0}\n\n`

  // If generation failed or no resources, provide helpful explanation
  if (
    !result.success ||
    !result.generated_resources ||
    result.generated_resources.length === 0
  ) {
    output += `## ⚠️ Generation Status\n\n`

    // Partial success - resources generated but with errors
    if (result.generated_resources && result.generated_resources.length > 0) {
      output += `**Partial Success**: ${result.generated_resources.length} FHIR resources were generated, but some had validation errors.\n\n`
      output += `**What this means:**\n`
      output += `- The resources shown below were successfully created\n`
      output += `- Some may not fully comply with FHIR specifications\n`
      output += `- You can still view the graph and download the bundle\n`
      output += `- Review the validation results below for specific issues\n\n`
    }
    // Complete failure
    else {
      if (!result.success) {
        output += `The FHIR generation process was not fully successful. This could be due to:\n\n`
        output += `- Incomplete or ambiguous patient journey information\n`
        output += `- Missing required clinical data\n`
        output += `- Validation errors during resource generation\n\n`
      }
      if (
        !result.generated_resources ||
        result.generated_resources.length === 0
      ) {
        output += `**No FHIR resources were generated.** This may happen when:\n\n`
        output += `- The input doesn't contain sufficient clinical information\n`
        output += `- The journey description is too vague or incomplete\n`
        output += `- The AI agent couldn't extract meaningful FHIR resources from the provided text\n\n`
        output += `**Suggestions:**\n`
        output += `- Include more specific clinical details (diagnoses, medications, procedures, vital signs)\n`
        output += `- Provide patient demographics (age, gender, relevant medical history)\n`
        output += `- Describe specific events or encounters in the patient's care journey\n`
        output += `- Use standard medical terminology when possible\n\n`
      }
    }
  }

  if (result.planning_details?.rationale) {
    output += `## Planning Rationale\n${result.planning_details.rationale}\n\n`
  }

  if (result.generated_resources && result.generated_resources.length > 0) {
    output += `## Generated FHIR Resources\n\n`
    result.generated_resources.forEach((resource: any, index: number) => {
      output += `### ${index + 1}. ${resource.resourceType}\n`
      output += `- **ID**: ${resource.id || 'N/A'}\n`

      // Add specific details based on resource type
      if (resource.resourceType === 'Patient' && resource.name) {
        output += `- **Name**: ${resource.name[0]?.text || 'N/A'}\n`
      }
      if (resource.resourceType === 'Condition' && resource.code) {
        output += `- **Condition**: ${resource.code.text || resource.code.coding?.[0]?.display || 'N/A'}\n`
      }
      if (
        resource.resourceType === 'MedicationRequest' &&
        resource.medicationCodeableConcept
      ) {
        output += `- **Medication**: ${resource.medicationCodeableConcept.text || 'N/A'}\n`
      }
      if (resource.resourceType === 'Observation' && resource.code) {
        output += `- **Observation**: ${resource.code.text || resource.code.coding?.[0]?.display || 'N/A'}\n`
        if (resource.valueQuantity) {
          output += `- **Value**: ${resource.valueQuantity.value} ${resource.valueQuantity.unit || ''}\n`
        }
      }

      output += `\n`
    })
  }

  if (result.validation_results && result.validation_results.length > 0) {
    output += `## Validation Results\n\n`
    result.validation_results.forEach((validation: any, index: number) => {
      const status = validation.is_valid ? '✅ Valid' : '❌ Invalid'
      output += `${index + 1}. **${validation.resource_type}**: ${status}\n`

      if (!validation.is_valid && validation.errors?.length > 0) {
        output += `   Errors:\n`
        validation.errors.forEach((error: string) => {
          output += `   - ${error}\n`
        })
      }
      output += `\n`
    })
  }

  if (result.errors && result.errors.length > 0) {
    output += `## Errors Encountered\n\n`
    result.errors.forEach((error: string) => {
      output += `- ${error}\n`
    })
    output += `\n`
  }

  return output
}
