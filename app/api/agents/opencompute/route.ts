import { createOpenAI } from '@ai-sdk/openai'
import { generateText, StreamData, streamText } from 'ai'

export const maxDuration = 300 // 5 minutes - max for Vercel Enterprise

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

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
    const { messages } = await req.json()

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
      model: openai.chat('gpt-4o-mini'),
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
    const response = await fetch(
      `${dataWarehouseUrl}/opencompute/generate-fhir-from-patient-journey`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(journeyData)
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `Data warehouse API error: ${response.status} - ${errorText}`
      )
    }

    const fhirResult = await response.json()

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
      data.append({
        type: 'fhir-metadata',
        bundleJson: fhirResult.bundle_json,
        graphData: fhirResult.graph_data,
        patientId: journeyData.patient_id
      })
    } else {
      console.log('No FHIR metadata to send - no resources generated')
    }

    // Stream the response back
    const result = streamText({
      model: openai.chat('gpt-4o-mini'),
      messages: [
        {
          role: 'system',
          content:
            'You are a passthrough system. Output the user message exactly as provided with no changes whatsoever.'
        },
        {
          role: 'user',
          content: formattedResponse
        }
      ],
      onFinish() {
        data.close()
      }
    })

    return result.toDataStreamResponse({ data })
  } catch (error) {
    console.error('OpenCompute agent error:', error)

    // Return error as a stream
    return streamText({
      model: openai.chat('gpt-4o-mini'),
      prompt: `There was an error generating FHIR resources: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or rephrase your request.`
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

  if (result.saved_to) {
    output += `## Files Saved\n`
    output += `The generated FHIR resources have been saved to: \`${result.saved_to}\`\n\n`
    output += `This includes:\n`
    output += `- **patient_bundle.json**: Complete FHIR Bundle\n`
    output += `- **bulk_fhir.jsonl**: All resources in JSONL format\n`
    output += `- **README.txt**: Summary of generated resources\n`
  }

  return output
}
