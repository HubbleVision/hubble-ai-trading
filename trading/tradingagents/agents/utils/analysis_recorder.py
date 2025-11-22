"""
Analysis recording utility for tracking agent executions.

Records each agent's execution to an external API for monitoring and analytics.
API calls are made synchronously to ensure reliable delivery of all records.
"""

import os
import requests
from datetime import datetime
from loguru import logger


def _get_api_config():
    """Get API configuration from environment variables (set by config.yaml)."""
    return {
        "base_url": os.getenv("ANALYSIS_API_URL", ""),
        "auth_header": os.getenv("ANALYSIS_API_AUTH", "")
    }




def send_analysis_record(
    trader_id: str,
    role: str,
    chat: str,
    record_id: str,
    json_value: str = None,
) -> None:
    """
    Send analysis record to external API synchronously.
    
    This function blocks until the API request completes or times out,
    ensuring reliable delivery of all records. The timeout is set to 5 seconds.
    
    Args:
        trader_id: Trader UUID from config.yaml
        role: Agent role name (e.g., "research_agent", "risk_manager", "portfolio_manager", "trader")
        chat: Agent's report/output
        record_id: UUID for the current trading round
        json_value: Optional stringified JSON for phased interaction records (used by research_agent)
    """
    # Disable uploads if APP_ENV is not configured
    if not os.getenv("APP_ENV"):
        logger.debug(f"Skipping record for {role} - APP_ENV not configured")
        return
    
    # Get API config at runtime (not at import time)
    api_config = _get_api_config()
    api_base_url = api_config["base_url"]
    api_auth_header = api_config["auth_header"]
    
    # Skip if API not configured
    if not api_base_url:
        logger.debug(f"Skipping record for {role} - API_BASE_URL not configured")
        return
    
    try:
        # Build request payload
        payload = {
            "traderId": trader_id,
            "role": role,
            "chat": chat,
            "recordId": record_id,
            "createdAt": datetime.utcnow().isoformat() + "Z",
        }
        
        # Add jsonValue if provided (for research_agent phased records)
        if json_value:
            payload["jsonValue"] = json_value
        
        # Send request
        url = f"{api_base_url}/analysis-records"
        headers = {
            "Content-Type": "application/json",
            "auth_admin": api_auth_header,
        }
        
        response = requests.post(url, json=payload, headers=headers, timeout=5)
        response.raise_for_status()
        
        logger.debug(f"✅ Recorded {role} execution for {trader_id} (record: {record_id[:8]}...)")
        
    except requests.exceptions.Timeout:
        logger.warning(f"⚠️ Timeout recording {role} execution (API took >5s)")
    except requests.exceptions.RequestException as e:
        logger.warning(f"⚠️ Failed to record {role} execution: {e}")
    except Exception as e:
        logger.error(f"❌ Unexpected error recording {role} execution: {e}")


def record_agent_execution(
    state: dict,
    agent_name: str,
    report_content: str,
    json_value: str = None,
) -> None:
    """
    Record an agent's execution to the API synchronously.
    
    This is a convenience wrapper that extracts necessary info from state
    and calls send_analysis_record. The API call is blocking to ensure
    reliable delivery of all records.
    
    Args:
        state: Current agent state
        agent_name: Agent name (e.g., "research_agent", "risk_manager", "portfolio_manager", "trader")
        report_content: The agent's report/output text
        json_value: Optional stringified JSON for phased interaction records (used by research_agent)
    """
    # Get trader ID from state (UUID from config.yaml)
    trader_id = state.get("trader_id", "Unknown")
    
    # Get record ID (UUID for this trading round)
    record_id = state.get("record_id")
    if not record_id:
        logger.warning(f"⚠️ No record_id in state, skipping recording for {agent_name}")
        return
    
    # Send the record synchronously
    send_analysis_record(
        trader_id=trader_id,
        role=agent_name,
        chat=report_content,
        record_id=record_id,
        json_value=json_value,
    )
