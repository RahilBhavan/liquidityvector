#!/bin/bash
# scripts/baseline_metrics.sh
# Captures baseline metrics for the application

OUTPUT_FILE="docs/BASELINE_METRICS.md"
DATE=$(date)

echo "# Baseline Metrics Report" > $OUTPUT_FILE
echo "**Date:** $DATE" >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

echo "## 1. Service Health" >> $OUTPUT_FILE
echo "\`\`\`json" >> $OUTPUT_FILE
curl -s http://localhost:8000/health >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE
echo "\`\`\`" >> $OUTPUT_FILE

echo "## 2. Resource Usage (Process)" >> $OUTPUT_FILE
echo "\`\`\`bash" >> $OUTPUT_FILE
ps aux | grep "uvicorn api.main:app" | grep -v grep | head -n 1 >> $OUTPUT_FILE
echo "\`\`\`" >> $OUTPUT_FILE

echo "## 3. Port Connectivity" >> $OUTPUT_FILE
echo "\`\`\`bash" >> $OUTPUT_FILE
lsof -i :8000 >> $OUTPUT_FILE
echo "\`\`\`" >> $OUTPUT_FILE

echo "Baseline metrics captured in $OUTPUT_FILE"
