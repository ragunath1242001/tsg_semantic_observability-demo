# FL Simulation Docker Image

This directory contains a Docker image that simulates Federated Learning (FL) participants for testing the Analytics Data Plane's job orchestration capabilities.

## Overview

The FL simulation implements a simple federated learning scenario where:

- **Participants** generate random numbers (simulating local model training) and send results to the analytics API
- **Aggregators** collect participant results and compute aggregated outcomes
- All communication happens through the analytics-data-plane-api event system

## Architecture

- **Docker Image**: `fl-simulation` - Contains Python script for FL participant/aggregator logic
- **Communication**: Uses analytics-data-plane-api events endpoints for coordination
- **Real Kubernetes Jobs**: Orchestrated by analytics-data-plane-api for authentic e2e testing

## Files

- `Dockerfile` - Multi-stage build for Python 3.9 slim image
- `requirements.txt` - Python dependencies (requests, urllib3)
- `src/fl_participant.py` - Main FL participant/aggregator script with API communication
- `README.md` - This documentation

## Environment Variables

The FL participant script expects these environment variables:

- `ANALYSIS_ID` - Analysis identifier from analytics-data-plane-api
- `CALLBACK_URL` - Base URL of analytics-data-plane-api (e.g., `http://localhost:3000/`)
- `EVENTS_ACCESS_TOKEN` - Bearer token for API authentication
- `PARTICIPANTS` - JSON array of participant IDs in the analysis (e.g., `["participant1", "participant2"]`)
- `FL_ROLE` - Either `participant` or `aggregator` (default: `participant`)
- `PARTICIPANT_ID` - Optional unique identifier for the participant

### Communication Flow

For simplicity, all events are sent to all participants in the analysis. This makes it easy to test the complete communication flow:
**Job → Data Plane → Other Data Planes → Other Jobs**

## API Integration

The FL participant now communicates with analytics-data-plane-api through:

### Events Endpoints

- `POST /events/{analysisId}/algorithm-event` - Send FL results/events
- `POST /events/{analysisId}/upload/{eventId}` - Upload additional data (model weights, metadata)
- `GET /events/{analysisId}/data/{eventId}` - Retrieve event data

### Event Data Structure

```json
{
  "eventId": "unique-uuid",
  "name": "participant_result_participant-123",
  "number": 42,
  "timestamp": "2024-01-01T12:00:00Z",
  "isOwnEvent": true
}
```

## Usage

### Build the image:

```bash
docker build -t fl-simulation .
```

### Run as participant:

```bash
docker run --rm \
  -e ANALYSIS_ID="analysis-123" \
  -e CALLBACK_URL="http://localhost:3000/" \
  -e EVENTS_ACCESS_TOKEN="your-auth-token" \
  -e FL_ROLE="participant" \
  -e PARTICIPANT_ID="participant-001" \
  fl-simulation
```

### Run as aggregator:

```bash
docker run --rm \
  -e ANALYSIS_ID="analysis-123" \
  -e CALLBACK_URL="http://localhost:3000/" \
  -e EVENTS_ACCESS_TOKEN="your-auth-token" \
  -e FL_ROLE="aggregator" \
  fl-simulation
```
