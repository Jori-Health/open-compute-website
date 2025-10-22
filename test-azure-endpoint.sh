#!/bin/bash

# Quick test script to diagnose Azure endpoint issues
# Replace YOUR_AZURE_URL with your actual Azure data warehouse URL

AZURE_URL="${NEXT_PUBLIC_DATA_WAREHOUSE_URL:-https://your-azure-url.azurewebsites.net}"

echo "========================================="
echo "Testing Azure Data Warehouse Endpoint"
echo "========================================="
echo ""

echo "1. Testing health endpoint..."
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" "${AZURE_URL}/health"
echo ""

echo "2. Testing OpenCompute endpoint with minimal payload..."
echo "URL: ${AZURE_URL}/opencompute/generate-fhir-from-patient-journey"
echo ""

response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST "${AZURE_URL}/opencompute/generate-fhir-from-patient-journey" \
  -H "Content-Type: application/json" \
  -H "Origin: https://open-compute-website.vercel.app" \
  -d '{
    "patient_id": "test-patient-123",
    "summary": "Test patient",
    "stages": [{
      "name": "Test",
      "description": "Test stage"
    }],
    "model": "openai/gpt-oss-120b",
    "llm_provider": "groq",
    "max_iterations": 1
  }')

http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d':' -f2)
body=$(echo "$response" | sed '/HTTP_STATUS/d')

echo "HTTP Status: $http_status"
echo ""

if [ "$http_status" = "200" ]; then
  echo "✅ SUCCESS! Endpoint is working"
  echo ""
  echo "Response preview (first 500 chars):"
  echo "$body" | head -c 500
  echo ""
elif [ "$http_status" = "500" ]; then
  echo "❌ INTERNAL SERVER ERROR - Azure backend issue"
  echo ""
  echo "Error response:"
  echo "$body"
  echo ""
  echo "Possible causes:"
  echo "- Missing GROQ_API_KEY or OPENAI_API_KEY in Azure"
  echo "- OpenCompute package not installed"
  echo "- Python error in the backend"
  echo ""
  echo "Check Azure logs:"
  echo "az webapp log tail --name your-data-warehouse --resource-group your-rg"
elif [ "$http_status" = "000" ] || [ "$http_status" = "" ]; then
  echo "❌ CONNECTION FAILED - Cannot reach Azure"
  echo ""
  echo "Possible causes:"
  echo "- Azure app is stopped or paused"
  echo "- URL is incorrect: $AZURE_URL"
  echo "- Network/firewall blocking the request"
  echo "- DNS issue"
  echo ""
  echo "Verify Azure is running:"
  echo "az webapp show --name your-data-warehouse --resource-group your-rg --query state"
else
  echo "❌ HTTP ERROR: $http_status"
  echo ""
  echo "Response:"
  echo "$body"
  echo ""
  if [ "$http_status" = "401" ] || [ "$http_status" = "403" ]; then
    echo "This might be an authentication or CORS issue"
  fi
fi

echo ""
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Check the HTTP status above"
echo "2. If 500: Check Azure application logs"
echo "3. If 000/connection failed: Verify Azure app is running"
echo "4. If CORS error: Deploy the CORS fixes to Azure"
echo ""

