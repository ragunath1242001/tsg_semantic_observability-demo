#!/usr/bin/env python3
"""
FL Participant - Simple Federated Learning Simulation

This script simulates a federated learning participant that:
1. Generates random numbers (simulating local model training)
2. Communicates with an analytics data plane API
3. Participates in aggregation workflows

Environment Variables:
- ALGORITHM_INSTANCE_ID: The algorithm instance identifier
- CALLBACK_URL: URL of the analytics-data-plane-api
- EVENTS_ACCESS_TOKEN: Token for API authentication
- PARTICIPANTS: JSON array of participant IDs in the algorithm instance
- FL_ROLE: 'aggregator' or 'participant' (default: participant)
- PARTICIPANT_ID: Optional unique identifier for this instance

All events are sent to all participants in the algorithm instance for simple testing.
"""

import os
import sys
import logging
import random
import time
import json
import uuid
from datetime import datetime
from typing import Optional, Dict, Any
import requests

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class FLParticipant:
    """Simple FL participant for simulation purposes."""
    
    def __init__(self):
        self.algorithm_instance_id = os.getenv('ALGORITHM_INSTANCE_ID')
        self.callback_url = os.getenv('CALLBACK_URL')
        self.access_token = os.getenv('EVENTS_ACCESS_TOKEN')
        self.role = os.getenv('FL_ROLE', 'participant')
        self.participant_id = os.getenv('PARTICIPANT_ID', f'participant-{uuid.uuid4().hex[:8]}')
        
        # Parse participants from JSON environment variable
        participants_env = os.getenv('PARTICIPANTS')
        self.participants = []
        if participants_env:
            try:
                self.participants = json.loads(participants_env)
            except json.JSONDecodeError:
                logger.warning(f"Failed to parse PARTICIPANTS environment variable: {participants_env}")
                self.participants = []

        # Log all environment variables for debugging
        logger.info("Environment Variables:")
        logger.info(f"ALGORITHM_INSTANCE_ID: {self.algorithm_instance_id}")
        logger.info(f"CALLBACK_URL: {self.callback_url}")
        logger.info(f"EVENTS_ACCESS_TOKEN: {'***' if self.access_token else 'None'}")  
        logger.info(f"FL_ROLE: {self.role}")
        logger.info(f"PARTICIPANT_ID: {self.participant_id}")
        logger.info(f"PARTICIPANTS: {self.participants}")
        
        # Validate required environment variables
        if not all([self.algorithm_instance_id, self.callback_url, self.access_token]):
            logger.error("Missing required environment variables")
            logger.error(f"ALGORITHM_INSTANCE_ID: {self.algorithm_instance_id}")
            logger.error(f"CALLBACK_URL: {self.callback_url}")
            logger.error(f"EVENTS_ACCESS_TOKEN: {'***' if self.access_token else 'None'}")
            sys.exit(1)
        
        # Ensure callback_url ends with /
        if not self.callback_url.endswith('/'):
            self.callback_url += '/'
    
    def _create_headers(self) -> Dict[str, str]:
        """Create headers for API requests."""
        return {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json'
        }
    
    def _send_algorithm_event(self, event_name: str, data: Dict[str, Any], recipients: Optional[list] = None) -> str:
        """Send an algorithm event to the analytics API."""
        event_id = str(uuid.uuid4())
        
        # Use provided recipients or default to all participants in the algorithm instance
        if recipients is None:
            recipients = self.participants.copy() if self.participants else []
        
        # Create the event payload
        payload = {
            'eventId': event_id,
            'name': event_name,
            'number': data.get('number', 0),
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'recipients': recipients
        }
        
        # Build the URL
        events_url = f"{self.callback_url}events/{self.algorithm_instance_id}/algorithm-event"
        
        logger.info(f"Sending event to: {events_url}")
        logger.info(f"Event payload: {payload}")
        
        try:
            response = requests.post(
                events_url,
                headers=self._create_headers(),
                json=payload,
                timeout=30
            )
            
            if response.status_code in [200, 201]:
                logger.info(f"Successfully sent event {event_id}")
                return event_id
            else:
                logger.error(f"Failed to send event. Status: {response.status_code}, Response: {response.text}")
                raise Exception(f"API request failed with status {response.status_code}")
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Network error sending event: {str(e)}")
            raise
    
    def _upload_event_data(self, event_id: str, data: bytes) -> None:
        """Upload binary data for an event."""
        upload_url = f"{self.callback_url}events/{self.algorithm_instance_id}/upload/{event_id}"
        
        headers = {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/octet-stream'
        }
        
        logger.info(f"Uploading data for event {event_id}")
        
        try:
            response = requests.post(
                upload_url,
                headers=headers,
                data=data,
                timeout=30
            )
            
            if response.status_code in [200, 201]:
                logger.info(f"Successfully uploaded data for event {event_id}")
            else:
                logger.error(f"Failed to upload data. Status: {response.status_code}, Response: {response.text}")
                raise Exception(f"Data upload failed with status {response.status_code}")
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Network error uploading data: {str(e)}")
            raise
    
    def _get_event_data(self, event_id: str) -> Optional[bytes]:
        """Retrieve event data from the analytics API."""
        data_url = f"{self.callback_url}events/{self.algorithm_instance_id}/data/{event_id}"
        
        try:
            response = requests.get(
                data_url,
                headers=self._create_headers(),
                timeout=30
            )
            
            if response.status_code == 200:
                logger.info(f"Successfully retrieved data for event {event_id}")
                return response.content
            elif response.status_code == 404:
                logger.warning(f"No data found for event {event_id}")
                return None
            else:
                logger.error(f"Failed to get event data. Status: {response.status_code}")
                return None
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Network error getting event data: {str(e)}")
            return None
    
    def run(self):
        """Main execution method."""
        logger.info(f"Starting FL participant with role: {self.role}")
        logger.info(f"Algorithm Instance ID: {self.algorithm_instance_id}")
        logger.info(f"Callback URL: {self.callback_url}")
        
        try:
            if self.role == 'aggregator':
                self._run_aggregator()
            else:
                self._run_participant()
                
            logger.info("FL participant completed successfully")
            
        except Exception as e:
            logger.error(f"FL participant failed: {str(e)}")
            sys.exit(1)
    
    def _run_participant(self):
        """Run as a participant node."""
        logger.info(f"Running as participant node: {self.participant_id}")
        
        # Simulate local training by generating a random number
        local_result = random.randint(1, 100)
        logger.info(f"Generated local result: {local_result}")
        
        # Send participant result as an algorithm event
        try:
            event_id = self._send_algorithm_event(
                event_name=f"participant_result",
                data={'number': local_result}
            )
            
            # Optionally upload additional data (e.g., model weights)
            additional_data = json.dumps({
                'participant_id': self.participant_id,
                'local_result': local_result,
                'timestamp': datetime.utcnow().isoformat(),
                'metadata': {
                    'training_rounds': 1,
                    'data_size': random.randint(100, 1000)
                }
            }).encode('utf-8')
            
            self._upload_event_data(event_id, additional_data)
            
            logger.info(f"Participant {self.participant_id} completed training and sent result")
            
        except Exception as e:
            logger.error(f"Failed to send participant result: {str(e)}")
            raise
        
        # Simulate some processing time
        time.sleep(2)
    
    def _run_aggregator(self):
        """Run as aggregator node."""
        logger.info("Running as aggregator node")
        
        # For now, just simulate aggregation by generating a final result
        # In a real scenario, this would collect and aggregate participant results
        aggregated_result = random.randint(1, 100)
        logger.info(f"Simulated aggregated result: {aggregated_result}")
        
        try:
            # Send aggregation result as an algorithm event
            event_id = self._send_algorithm_event(
                event_name="aggregation_result",
                data={'number': aggregated_result}
            )
            
            # Upload aggregation metadata
            aggregation_data = json.dumps({
                'role': 'aggregator',
                'aggregated_result': aggregated_result,
                'timestamp': datetime.utcnow().isoformat(),
                'metadata': {
                    'participant_count': random.randint(2, 5),
                    'aggregation_method': 'federated_average'
                }
            }).encode('utf-8')
            
            self._upload_event_data(event_id, aggregation_data)
            
            logger.info("Aggregator completed aggregation and sent result")
            
        except Exception as e:
            logger.error(f"Failed to send aggregation result: {str(e)}")
            raise
        
        # Simulate aggregation time
        time.sleep(3)


def main():
    """Main entry point."""
    logger.info("Starting FL simulation participant")
    
    participant = FLParticipant()
    participant.run()


if __name__ == "__main__":
    main()
