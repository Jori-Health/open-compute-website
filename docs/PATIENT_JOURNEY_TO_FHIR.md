# Patient Journey to FHIR Agent

This document explains how to use the Patient Journey to FHIR agent in the Open Compute website.

## Overview

The Patient Journey to FHIR agent uses OpenCompute to automatically generate comprehensive, validated FHIR resources from natural language patient journey descriptions. It integrates with the Jori data warehouse backend to provide AI-powered FHIR generation.

## Setup

### 1. Environment Variables

Add the following environment variable to your `.env.local` file:

```bash
# Data Warehouse URL (required for Jori Agents)
NEXT_PUBLIC_DATA_WAREHOUSE_URL=http://localhost:5050

# Or for production
NEXT_PUBLIC_DATA_WAREHOUSE_URL=https://your-data-warehouse-url.com
```

### 2. Data Warehouse Backend

Ensure your data warehouse backend is running with the OpenCompute route enabled:

```bash
cd /Users/bkyritz/Code/Jori/data-warehouse
python main.py
```

The backend should have the `/opencompute/generate-fhir-from-patient-journey` endpoint available.

### 3. OpenAI API Key

The data warehouse backend requires an OpenAI API key for FHIR generation:

```bash
export OPENAI_API_KEY='your-openai-api-key'
```

## Usage

### Step 1: Select the Agent

1. Open the Open Compute website
2. Click on the model selector dropdown
3. Select **"Patient Journey to FHIR"** under the **Jori Agents** section

### Step 2: Describe the Patient Journey

Type or paste a patient journey description. The agent will automatically extract:
- Patient information
- Journey stages (Registration, Triage, Diagnosis, Treatment, etc.)
- Medical details (vital signs, medications, procedures, etc.)
- Temporal information

#### Example Queries

**Example 1: Emergency Room Visit**
```
A 58-year-old male named John Doe presented to the emergency room with chest pain. 
During triage, his blood pressure was 150/95 mmHg and heart rate was 88 bpm. 
He was diagnosed with acute myocardial infarction (ICD-10: I21.9). 
He was given aspirin 325mg and nitroglycerin 0.4mg. 
Emergency cardiac catheterization was performed at 12:00 PM.
```

**Example 2: Routine Checkup**
```
Jane Smith, a 45-year-old female, came in for her annual physical on January 15, 2024.
Weight: 150 lbs, Height: 5'6", Blood Pressure: 120/80 mmHg.
She has a history of type 2 diabetes, currently controlled with Metformin 500mg twice daily.
Lab work showed HbA1c of 6.8%, cholesterol within normal limits.
```

**Example 3: Multi-Stage Treatment**
```
Patient registered at oncology clinic for breast cancer treatment.
Initial consultation showed stage 2 invasive ductal carcinoma.
Underwent lumpectomy on March 1, 2024.
Started chemotherapy regimen: Doxorubicin and Cyclophosphamide every 21 days.
Follow-up imaging showed good response to treatment.
```

### Step 3: Review Results

The agent will return:

1. **Patient Information Summary**: Extracted patient details and journey overview
2. **Generation Status**: Success/failure status and number of iterations
3. **Planning Rationale**: AI's reasoning for the resources it generated
4. **Generated FHIR Resources**: List of all created resources with key details
   - Patient
   - Encounter
   - Condition
   - Observation (vital signs, lab results)
   - MedicationRequest
   - Procedure
   - And more...
5. **Validation Results**: Validation status for each resource
6. **Saved Files**: Location of saved FHIR bundles

## Generated Files

FHIR resources are automatically saved on the backend at:
```
output/<patient_name>/
  ├── patient_bundle.json    # Complete FHIR Bundle
  ├── bulk_fhir.jsonl        # Resources in JSONL format
  └── README.txt             # Summary of resources
```

## How It Works

```
User Input
    ↓
Model Selector (Patient Journey to FHIR)
    ↓
Frontend (open-compute-website)
    ↓
/api/chat/route.ts (detects jori-agents provider)
    ↓
/api/agents/opencompute/route.ts
    ↓
OpenAI Extraction (structured patient journey)
    ↓
Data Warehouse Backend
    ↓
/opencompute/generate-fhir-from-patient-journey
    ↓
OpenCompute Library (AI-powered FHIR generation)
    ↓
Validated FHIR Resources
    ↓
Response Formatting
    ↓
Display Results to User
```

## Architecture

### Frontend (open-compute-website)
- **Model Configuration**: Added "Patient Journey to FHIR" to `models.json`
- **Provider Registry**: Added `jori-agents` provider support
- **Chat Router**: Detects agent requests and routes to agent-specific endpoint
- **Agent Endpoint**: `/api/agents/opencompute/route.ts` handles extraction and backend communication
- **UI**: Model selector shows Jori Agents with custom logo

### Backend (data-warehouse)
- **OpenCompute Route**: `/opencompute/generate-fhir-from-patient-journey`
- **FHIR Generation**: Uses OpenCompute library for AI-powered resource creation
- **Validation**: Validates all generated resources
- **Storage**: Saves resources to file system

## Troubleshooting

### Agent Not Showing in Dropdown
- Check that `NEXT_PUBLIC_DATA_WAREHOUSE_URL` is set in `.env.local`
- Restart the Next.js development server

### "Provider Not Enabled" Error
- Verify the data warehouse URL is accessible
- Check that the backend is running

### FHIR Generation Fails
- Ensure OpenAI API key is set in the data warehouse backend
- Check backend logs for errors
- Verify the OpenCompute package is installed: `pip install open-compute`

### Empty or Invalid Results
- Try providing more detailed patient information
- Include specific medical terminology (ICD codes, medication names, etc.)
- Structure the input with clear stages (registration, triage, diagnosis, etc.)

## Advanced Usage

### Custom FHIR Version
The backend defaults to FHIR R4, but you can modify the request to use different versions by updating the OpenCompute route parameters.

### Iteration Control
The agent uses up to 3 iterations for refinement by default. This can be adjusted in the backend route configuration.

### Integration with EHR Systems
The generated FHIR resources can be:
- Imported into EHR systems that support FHIR
- Used for interoperability testing
- Converted to other formats (HL7 v2, CDA, etc.)

## Next Steps

- Add more Jori Agents (Clinical Trials Matcher, Treatment Planner, etc.)
- Enhance the UI to show interactive FHIR resource viewers
- Add export functionality for different formats
- Implement batch processing for multiple patients

