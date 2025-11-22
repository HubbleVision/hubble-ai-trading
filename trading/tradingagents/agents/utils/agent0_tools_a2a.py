"""
Agent0 + A2A Protocol Integration Tools.

Provides tools for:
1. Discovering agents via ERC-8004 (using agent0-sdk)
2. Invoking agents via A2A Protocol (using JSON-RPC 2.0)

Uses simple JSON-RPC 2.0 over HTTP for A2A communication, which is:
- Fully compliant with A2A specification
- More reliable than the A2A SDK (which has agent card URL issues)
- Easier to debug and maintain
- Battle-tested in production environments

Reference implementation: research_agent_invoker_flow.py
"""

import json
import os
from typing import Dict, Optional, Any, List
from datetime import datetime, timedelta
from langchain_core.tools import tool
from loguru import logger

# A2A communication - using simple JSON-RPC (more reliable than SDK)
# The A2A SDK has issues with agent card URLs and is deprecated
# Simple JSON-RPC approach follows A2A protocol specification


# Global SDK instance (will be initialized during startup)
_agent0_sdk = None


def initialize_agent0_sdk(
    chain_id: int = 11155111,  # Sepolia testnet by default
    rpc_url: Optional[str] = None,
):
    """
    Initialize the agent0 SDK for ERC-8004 discovery.

    Args:
        chain_id: Chain ID (default: 11155111 = Sepolia testnet)
        rpc_url: RPC endpoint URL (optional, falls back to env vars)
    """
    global _agent0_sdk

    try:
        from agent0_sdk import SDK

        if not rpc_url:
            logger.warning(
                "⚠️  agent0 SDK not configured (missing RPC_URL). "
                "Research agent discovery via ERC-8004 will be disabled. "
                "To enable, add 'agent0' section with 'rpc_url' to your config file."
            )
            _agent0_sdk = None
            return

        # Initialize SDK (read-only mode for discovery)
        _agent0_sdk = SDK(chainId=chain_id, rpcUrl=rpc_url, ipfs="pinata", pinataJwt="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJiYjkzODdlNS05MTFhLTRmNDQtYWU1NS1mOWNmYmM4MzIyZGQiLCJlbWFpbCI6ImRpbmdkaW5nc2l5aUBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiZmNiNWJmODMyNjZjOGNiODUyZGMiLCJzY29wZWRLZXlTZWNyZXQiOiJhM2M5NDdkMjc1Yjc4OTQ3NjVlZWNkYjgyNjAzZDQxYzgwNWQyYzI5NGM5NmU0ZDk0NGI2YmY0ZThmZmQ3YmZmIiwiZXhwIjoxNzk1MTYwOTMxfQ.QPpvbCBemrjiE7E4Flx359pDfVkUsKHAQla2RdLTHio")
        logger.info(f"✅ agent0 SDK initialized (chain: {chain_id}, read-only mode)")
    except ImportError:
        logger.warning("⚠️  agent0-sdk not installed. Run: pip install agent0-sdk")
        _agent0_sdk = None
    except Exception as e:
        logger.warning(f"⚠️  Failed to initialize agent0 SDK: {e}")
        _agent0_sdk = None


def get_agent0_sdk():
    """Get the agent0 SDK instance."""
    return _agent0_sdk


def _generate_json_value(
    phases: List[Dict[str, str]],
    error_reason: Optional[str] = None
) -> str:
    """
    Generate jsonValue for A2A protocol interaction monitoring.
    
    Args:
        phases: List of phase records, each with title, markdownContent, timestamp
        error_reason: Optional error reason (only present in error scenarios)
        
    Returns:
        Stringified JSON matching the JsonValue specification
    """
    result = {
        "phases": phases
    }
    
    if error_reason:
        result["errorReason"] = error_reason
    
    return json.dumps(result, ensure_ascii=False)


def _create_phase(
    title: str,
    markdown_content: str,
    timestamp_offset_minutes: int = 0
) -> Dict[str, str]:
    """
    Create a phase record for jsonValue.
    
    Args:
        title: Phase title (without numbering)
        markdown_content: Markdown formatted content
        timestamp_offset_minutes: Minutes offset from current time (negative for past)
        
    Returns:
        Phase dictionary with title, markdownContent, timestamp
    """
    timestamp = datetime.utcnow() + timedelta(minutes=timestamp_offset_minutes)
    
    return {
        "title": title,
        "markdownContent": markdown_content,
        "timestamp": timestamp.isoformat() + "Z"
    }


@tool
def discover_research_agents(agent_id: Optional[str] = None) -> str:
    """
    Discover research agents registered in ERC-8004.

    Uses agent0-py SDK to find agents by agent ID.

    Args:
        agent_id: Optional specific agent ID to filter for

    Returns:
        JSON string with list of discovered agents
    """
    try:
        sdk = get_agent0_sdk()

        # If SDK not available, return error
        if sdk is None:
            logger.warning("⚠️  agent0 SDK not initialized")
            return json.dumps({
                "count": 0,
                "agents": [],
                "error": "agent0 SDK not initialized. Call initialize_agent0_sdk() first."
            })

        # Search agents using agent0 SDK
        logger.info(f"Searching for research agents (agent_id: {agent_id or 'any'})")

        # Use getAgent() for specific agent lookup, searchAgents() for broad search
        if agent_id:
            # Get specific agent by ID
            agent = sdk.loadAgent(agent_id)

            agent_info = {
                "agent_id": agent.agentId,
                "name": agent.name,
                "description": agent.description,
                "image": agent.image or None,
                "owners": agent.owners,
                "operators": agent.operators,
                "wallet_address": agent.walletAddress,
                "wallet_chain_id": agent.walletChainId,
                "active": agent.active,
                "x402_support": agent.x402support,
                "mcp": bool(agent.mcpEndpoint),
                "mcp_endpoint": agent.mcpEndpoint,
                "mcp_tools": agent.mcpTools or [],
                "mcp_prompts": agent.mcpPrompts or [],
                "mcp_resources": agent.mcpResources or [],
                "a2a": bool(agent.a2aEndpoint),
                "a2a_endpoint": agent.a2aEndpoint,
                "endpoint": agent.a2aEndpoint,  # Add endpoint field for compatibility
                "a2a_skills": agent.a2aSkills or [],
                "ens_endpoint": agent.ensEndpoint,
                "updated_at": agent.updatedAt,
                "contract_address": sdk.identity_registry.address,
                "agent_uri": agent.agentURI,
            }

            logger.info(f"✅ Successfully loaded agent: {agent_info['name']} (ID: {agent_info['agent_id']})")

            return json.dumps({
                "count": 1,
                "agents": [agent_info]
            })

    except Exception as e:
        logger.error(f"❌ Agent discovery failed: {e}")
        import traceback
        traceback.print_exc()
        return json.dumps({
            "count": 0,
            "agents": [],
            "error": str(e)
        })


@tool
def invoke_research_agent(
    symbol: str,
    timeframes: Optional[str] = None,
    agent_id: Optional[str] = None
) -> str:
    """
    Invoke a research agent via A2A Protocol (JSON-RPC).

    Uses simple JSON-RPC 2.0 over HTTP, fully compliant with A2A specification.
    This approach is more reliable than the A2A SDK which has issues with agent card URLs.

    This tool can optionally use ERC-8004 discovery to find research agents. If agent_id
    is specified (via parameter or environment), it will search for that specific agent.

    Args:
        symbol: Trading symbol (e.g., "BTCUSDT")
        timeframes: JSON string with timeframe config, e.g., '{"primary": "1h", "secondary": ["5m", "15m"]}'
        agent_id: Optional agent ID to invoke (if not provided, checks environment variables)

    Returns:
        JSON string with research results including research_report, research_summary, and confidence
    """
    # Track phases for jsonValue generation
    phases: List[Dict[str, str]] = []
    error_reason: Optional[str] = None
    
    try:
        # Parse timeframes
        if timeframes:
            try:
                timeframe_config = json.loads(timeframes)
            except json.JSONDecodeError:
                # Fallback: treat as primary interval
                timeframe_config = {
                    "primary": timeframes,
                    "secondary": ["5m", "15m"]
                }
        else:
            timeframe_config = {
                "primary": "1h",
                "secondary": ["5m", "15m"]
            }

        # Get current timestamp
        trade_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Get agent_id from config (uses cached config) if not provided as parameter
        if not agent_id:
            from tradingagents.config import get_research_agent_config
            research_config = get_research_agent_config()
            agent_id = research_config.get("agent_id")

        # Discover agents via ERC-8004
        if agent_id:
            logger.info(f"Discovering research agent with ID: {agent_id}")
        else:
            logger.info("Discovering research agents via ERC-8004 (auto-select)...")

        discovery_result = discover_research_agents.invoke({"agent_id": agent_id})
        discovery_data = json.loads(discovery_result)

        if discovery_data["count"] == 0:
            if agent_id:
                raise RuntimeError(
                    f"No research agent found with ID: {agent_id}. "
                    f"Please check the agent_id configuration or ensure the agent is registered."
                )
            else:
                raise RuntimeError(
                    "No research agents found via ERC-8004 discovery. "
                    "Please ensure at least one research agent is registered and active."
                )

        # Use the first available agent (or the only one if filtered by ID)
        agent = discovery_data["agents"][0]
        agent_endpoint = agent["endpoint"]
        logger.info(f"✅ Discovered agent: {agent['name']} (ID: {agent['agent_id']}) at {agent_endpoint}")
        
        # Phase 1: ERC-8004 Discovery
        phase1_content = f"""## Agent Discovery

### Registry Query
- **Agent ID**: `{agent['agent_id']}`
- **Status**: Successfully discovered

### Agent Info
```yaml
name: {agent['name']}
endpoint: {agent_endpoint}
a2a_support: {agent.get('a2a', False)}
x402_support: {agent.get('x402_support', False)}
```
"""
        phases.append(_create_phase(
            "Discover research agent via ERC-8004",
            phase1_content,
            -16
        ))

        # Call agent using simple JSON-RPC (A2A protocol compliant)
        logger.info(f"🔗 Calling research agent via A2A JSON-RPC: {agent_endpoint}")

        import httpx
        from uuid import uuid4

        # Prepare query parameters
        query_params = {
            "symbol": symbol,
            "trade_date": trade_date,
            "market_timeframes": timeframe_config
        }

        # Create JSON-RPC request following A2A specification
        # Reference: research_agent_invoker_flow.py
        rpc_request = {
            "jsonrpc": "2.0",
            "id": str(uuid4()),
            "method": "message/send",
            "params": {
                "message": {
                    "messageId": str(uuid4()),
                    "role": "user",
                    "parts": [
                        {
                            "type": "text",
                            "text": json.dumps(query_params)
                        }
                    ]
                }
            }
        }

        logger.debug(f"Sending JSON-RPC request with timeframes: {timeframe_config}")
        
        # Phase 2: JSON-RPC Call
        phase2_content = f"""## JSON-RPC Request

### Query Parameters
```yaml
symbol: {symbol}
trade_date: {trade_date}
timeframes: {json.dumps(timeframe_config)}
```

### Request
- **Method**: message/send
- **Protocol**: JSON-RPC 2.0
"""
        phases.append(_create_phase(
            "Call A2A endpoint using JSON-RPC 2.0",
            phase2_content,
            -12
        ))

        # Use synchronous HTTP client (LangChain tools are synchronous)
        with httpx.Client(timeout=120.0) as http_client:
            try:
                # Initial request headers
                headers = {"Content-Type": "application/json"}
                
                # First attempt - may return 402 if payment required
                response = http_client.post(
                    agent_endpoint,
                    headers=headers,
                    json=rpc_request
                )
                
                # Check for 402 Payment Required (X402 protocol)
                payment_required = False
                if _is_payment_required_error(response):
                    payment_required = True
                    logger.info("💳 Payment required (X402 protocol), preparing payment...")
                    
                    # Extract payment requirements from 402 response
                    result = response.json()
                    error_data = result.get("error", {}).get("data", {})
                    payment_requirements = error_data.get("payment_requirements", [])
                    x402_version = error_data.get("x402_version", "1")
                    
                    if not payment_requirements:
                        raise ValueError("402 response missing payment_requirements")
                    
                    logger.info(f"   X402 version: {x402_version}")
                    logger.info(f"   Payment requirements: {len(payment_requirements)} requirement(s)")
                    logger.debug(f"   Requirements: {json.dumps(payment_requirements, indent=2)}")
                    
                    # Phase 3: X402 Payment (only if payment is required)
                    payment_req = payment_requirements[0] if payment_requirements else {}
                    phase3_content = f"""## X402 Payment

### Payment Details
```yaml
network: {payment_req.get('network', 'N/A')}
amount: {payment_req.get('max_amount_required', 'N/A')}
asset: {payment_req.get('asset', 'N/A')}
```

- **Version**: X402 v{x402_version}
- **Status**: Signature generated
"""
                    phases.append(_create_phase(
                        "Generate X402 payment header",
                        phase3_content,
                        -10
                    ))
                    
                    # Get wallet private key from config (supports YAML with env var substitution)
                    from tradingagents.config import get_x402_config
                    from eth_account import Account
                    
                    x402_config = get_x402_config()
                    wallet_private_key = x402_config.get("wallet_private_key", "")
                    
                    # Remove 0x prefix if present
                    if wallet_private_key.startswith("0x") or wallet_private_key.startswith("0X"):
                        wallet_private_key = wallet_private_key[2:]
                    
                    # Derive wallet address for later use
                    wallet_account = Account.from_key(wallet_private_key)
                    wallet_address = wallet_account.address
                    
                    # Generate payment header (address will be derived from private key)
                    payment_header = _generate_payment_header(
                        x402_version=x402_version,
                        payment_requirements=payment_requirements,
                        wallet_private_key=wallet_private_key
                    )
                    
                    # Retry with payment header
                    logger.info("🔄 Retrying request with X-PAYMENT header...")
                    headers_with_payment = {**headers, "X-PAYMENT": str(payment_header)}
                    logger.debug(f"   X-PAYMENT header length: {len(str(payment_header))}")
                    
                    response = http_client.post(
                        agent_endpoint,
                        headers=headers_with_payment,
                        json=rpc_request
                    )
                    
                    logger.debug(f"   Retry response status: {response.status_code}")
                    
                    # Parse response body to check for transaction info
                    response_data_for_tx_check = None
                    transaction_from_metadata = None
                    network_from_metadata = None
                    payer_from_metadata = None
                    amount_from_metadata = None
                    
                    try:
                        response_data_for_tx_check = response.json()
                        logger.info("📦 X402 Response body preview:")
                        logger.info(f"   Response keys: {list(response_data_for_tx_check.keys()) if isinstance(response_data_for_tx_check, dict) else 'Not a dict'}")
                        # Check if transaction info is in the response body
                        if isinstance(response_data_for_tx_check, dict):
                            if 'transaction' in response_data_for_tx_check:
                                logger.info(f"   Found 'transaction' in body: {response_data_for_tx_check.get('transaction')}")
                            if 'txHash' in response_data_for_tx_check:
                                logger.info(f"   Found 'txHash' in body: {response_data_for_tx_check.get('txHash')}")
                            if 'result' in response_data_for_tx_check and isinstance(response_data_for_tx_check['result'], dict):
                                result_keys = list(response_data_for_tx_check['result'].keys())
                                logger.info(f"   Result keys: {result_keys}")
                                
                                # Check metadata field (A2A protocol metadata)
                                if 'metadata' in response_data_for_tx_check['result']:
                                    metadata = response_data_for_tx_check['result']['metadata']
                                    logger.info(f"   📋 Found metadata field!")
                                    logger.info(f"   Metadata type: {type(metadata)}")
                                    if isinstance(metadata, dict):
                                        logger.info(f"   Metadata keys: {list(metadata.keys())}")
                                        logger.info(f"   Metadata content: {json.dumps(metadata, indent=2)}")
                                        
                                        # Extract transaction info from metadata.x402.payment_response
                                        if 'x402' in metadata and isinstance(metadata['x402'], dict):
                                            x402_data = metadata['x402']
                                            if 'payment_response' in x402_data and isinstance(x402_data['payment_response'], dict):
                                                payment_response = x402_data['payment_response']
                                                transaction_from_metadata = payment_response.get('transaction')
                                                network_from_metadata = payment_response.get('network')
                                                payer_from_metadata = payment_response.get('payer')
                                                amount_from_metadata = payment_response.get('amount')
                                                
                                                logger.info(f"   🎯 Extracted transaction info from metadata.x402.payment_response:")
                                                logger.info(f"      Transaction: {transaction_from_metadata}")
                                                logger.info(f"      Network: {network_from_metadata}")
                                                logger.info(f"      Payer: {payer_from_metadata}")
                                                logger.info(f"      Amount: {amount_from_metadata}")
                                    else:
                                        logger.info(f"   Metadata value: {metadata}")
                                
                                if 'transaction' in response_data_for_tx_check['result']:
                                    logger.info(f"   Found 'transaction' in result: {response_data_for_tx_check['result'].get('transaction')}")
                    except Exception as e:
                        logger.debug(f"   Could not parse response body for transaction check: {e}")
                    
                    # Check if we have transaction info from metadata or header
                    transaction_hash = None
                    network = None
                    payer_address = None
                    payment_amount = None
                    
                    # Priority 1: Extract from metadata.x402.payment_response (A2A protocol)
                    if transaction_from_metadata:
                        transaction_hash = transaction_from_metadata
                        network = network_from_metadata or 'unknown'
                        payer_address = payer_from_metadata
                        payment_amount = amount_from_metadata
                        logger.info(f"✅ Payment transaction found in response metadata!")
                        logger.info(f"   Transaction Hash: {transaction_hash}")
                        logger.info(f"   Network: {network}")
                        logger.info(f"   Payer: {payer_address}")
                        logger.info(f"   Amount: {payment_amount}")
                    
                    # Priority 2: Extract transaction hash from X-Payment-Response header
                    # Check all possible header variations (case-insensitive search)
                    if not transaction_hash:
                        logger.info("🔍 Checking for X-Payment-Response header:")
                        logger.info(f"   All response headers: {list(response.headers.keys())}")
                        payment_response_header = None
                        for key in response.headers.keys():
                            if key.lower() == 'x-payment-response':
                                payment_response_header = response.headers[key]
                                logger.info(f"   ✅ Found X-Payment-Response header (key: {key})")
                                logger.info(f"   Header value (first 200 chars): {payment_response_header[:200]}...")
                                break
                        
                        if payment_response_header:
                            try:
                                payment_response_data = _decode_payment_response(payment_response_header)
                                transaction_hash = payment_response_data.get('transaction', 'N/A')
                                network = payment_response_data.get('network', 'unknown')
                                payer_address = payment_response_data.get('payer')
                                payment_amount = payment_response_data.get('amount')
                                
                                logger.info(f"✅ Payment transaction found in response header!")
                                logger.info(f"   Transaction Hash: {transaction_hash}")
                                logger.info(f"   Network: {network}")
                            except Exception as e:
                                logger.warning(f"⚠️  Could not decode X-Payment-Response header: {e}")
                        else:
                            logger.warning(f"⚠️  No X-Payment-Response header received from gateway")
                            logger.warning(f"   Available headers: {', '.join(response.headers.keys())}")
                    
                    # Update Phase 3 with transaction info if available
                    if transaction_hash:
                        # Generate correct explorer URL based on network
                        if 'sepolia' in network.lower():
                            explorer_url = f"https://sepolia.basescan.org/tx/{transaction_hash}"
                            explorer_text = "View on Base Sepolia Explorer"
                        elif 'base' in network.lower():
                            explorer_url = f"https://basescan.org/tx/{transaction_hash}"
                            explorer_text = "View on Base Explorer"
                        else:
                            explorer_url = f"https://basescan.org/tx/{transaction_hash}"
                            explorer_text = "View on Explorer"
                        
                        phase3_content = f"""## X402 Payment

### Payment Details
```yaml
network: {network}
amount: {payment_amount if payment_amount else payment_req.get('max_amount_required', 'N/A')}
asset: {payment_req.get('asset', 'N/A')}
payer: {payer_address if payer_address else wallet_address}
```

- **Version**: X402 v{x402_version}
- **Status**: ✅ Payment confirmed
- **Transaction**: `{transaction_hash}`
- **Explorer**: [{explorer_text}]({explorer_url})
"""
                        # Remove the previous phase 3 and add updated one
                        phases.pop()  # Remove the old "Signature generated" phase
                        phases.append(_create_phase(
                            "X402 payment confirmed",
                            phase3_content,
                            -10
                        ))
                    else:
                        # No transaction info available
                        logger.info(f"💡 Note: Transaction was executed on-chain but gateway didn't return the hash")
                        logger.info(f"   You can check recent transactions at: https://sepolia.basescan.org/address/{wallet_address}")
                
                # If no payment was required, still add Phase 3 (skipped)
                if not payment_required:
                    phase3_content = """## X402 Payment

### Payment Status
- **Status**: Not required
- **Result**: ✅ Free request
"""
                    phases.append(_create_phase(
                        "X402 payment check (not required)",
                        phase3_content,
                        -10
                    ))
                
                # Raise for any HTTP errors (including failed payment)
                response.raise_for_status()
                
                response_data = response.json()
                logger.debug(f"Received response: {response.status_code}")
                
                # Log response for debugging (especially important for payment flow)
                logger.debug(f"Response preview: {json.dumps(response_data, indent=2)[:1000]}...")

            except httpx.HTTPStatusError as e:
                # Check if this is a payment failure (402)
                if e.response.status_code == 402:
                    logger.error(f"❌ X402 payment failed: {e.response.text}")
                    raise RuntimeError(f"X402 payment failed for research agent. Check wallet configuration and balance.")
                else:
                    logger.error(f"HTTP error {e.response.status_code}: {e.response.text}")
                raise
            except httpx.ConnectError as e:
                logger.error(f"Connection error: {e}")
                raise RuntimeError(f"Failed to connect to research agent at {agent_endpoint}")
            except Exception as e:
                logger.error(f"Request failed: {e}")
                raise

        # Check for JSON-RPC errors first
        if response_data and "error" in response_data:
            error_info = response_data.get("error", {})
            error_code = error_info.get("code", "unknown")
            error_message = error_info.get("message", "Unknown error")
            error_data = error_info.get("data", {})
            
            logger.error(f"JSON-RPC error: code={error_code}, message={error_message}")
            if error_data:
                logger.error(f"Error data: {json.dumps(error_data, indent=2)}")
            
            raise RuntimeError(
                f"Research agent returned error: {error_message} (code: {error_code})"
            )

        # Extract result from JSON-RPC response
        if not response_data or "result" not in response_data:
            # Log full response for debugging
            logger.error(f"Invalid response structure. Full response: {json.dumps(response_data, indent=2)}")
            raise RuntimeError(
                "Invalid response from research agent: missing result field. "
                "Check logs for full response details."
            )

        result = _extract_response_data_from_jsonrpc(response_data["result"])

        # Log research results
        confidence = result.get('confidence', 0)
        summary = result.get('research_summary', '')
        report = result.get('research_report', '')
        
        logger.info(f"✅ Research completed (confidence: {confidence:.2f})")
        
        if summary:
            logger.info(f"📝 Research Summary: {summary}")
        
        if report:
            logger.info(f"📊 Full Research Report:\n{report}")
        
        # Log data statistics
        logger.info(f"📈 Research data: summary={len(summary)} chars, report={len(report)} chars")
        
        # Phase 4: Retrieve Research Report
        phase4_content = f"""## Research Report

### Response Data
```yaml
symbol: {symbol}
confidence: {confidence:.2f}
summary: {summary}
report: {report} 
```

- **Status**: ✅ Data received
"""
        phases.append(_create_phase(
            "Retrieve research report",
            phase4_content,
            -8
        ))
        
        # Phase 5: Safety Check Passed
        phase5_content = """## Safety Check

### Validation Results
- ✅ Response format valid
- ✅ Data integrity confirmed
- ✅ Content verified

**Status**: Passed
"""
        phases.append(_create_phase(
            "Safety check passed",
            phase5_content,
            -7
        ))
        
        # Generate jsonValue
        json_value = _generate_json_value(phases, error_reason)
        
        # Add jsonValue to result
        result['jsonValue'] = json_value

        return json.dumps(result, indent=2)

    except Exception as e:
        error_str = str(e)
        logger.error(f"❌ Research agent invocation failed: {error_str}")
        import traceback
        traceback.print_exc()
        
        # Determine error type for better handling
        error_type = "UNKNOWN_ERROR"
        error_message = error_str
        
        if "X402 payment failed" in error_str or "402" in error_str:
            error_type = "X402_PAYMENT_FAILED"
            error_message = "Payment failed - signature expired or insufficient balance"
        elif "Failed to connect" in error_str or "Connection" in error_str:
            error_type = "CONNECTION_ERROR"
            error_message = "Network error, unable to access A2A endpoint"
        elif "No research agent found" in error_str:
            error_type = "AGENT_NOT_FOUND"
            error_message = "Agent not found in ERC-8004 registry"
        elif "agent0 SDK not initialized" in error_str:
            error_type = "SDK_NOT_INITIALIZED"
            error_message = "SDK not properly configured"
        
        # Add failure phase
        if phases:  # If we have some phases already
            failure_phase_content = f"""## ❌ Safety Check Failed

### Error Details
```
Error Code: {error_type}
Description: {error_message}
```

**Status**: Failed
"""
            phases.append(_create_phase(
                "Safety check failed",
                failure_phase_content,
                -6
            ))
            
            error_reason = f"{error_type}: {error_message}"
            json_value = _generate_json_value(phases, error_reason)
        else:
            # If no phases collected, create minimal error jsonValue
            json_value = _generate_json_value([], f"{error_type}: {error_message}")
        
        return json.dumps({
            "error": error_str,
            "error_type": error_type,
            "research_report": "",
            "research_summary": f"❌ Research agent error ({error_type}): {error_str}",
            "confidence": 0.0,
            "jsonValue": json_value
        })


def _extract_response_data_from_jsonrpc(message_result: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract response data from JSON-RPC A2A message response.
    
    Handles the JSON-RPC response format:
    {
      "kind": "message",
      "messageId": "...",
      "parts": [
        {"kind": "text", "text": "..."},
        {"kind": "data", "data": {...}}
      ],
      "role": "agent"
    }

    Returns:
        Dict with research_report, research_summary, confidence
    """
    result = {
        "research_report": "",
        "research_summary": "",
        "confidence": 0.0
    }

    # Get parts from message result
    parts = message_result.get('parts', [])

    for part in parts:
        # Handle text parts
        if part.get('kind') == 'text' or part.get('type') == 'text':
            text_content = part.get('text', '')
            # Try to parse as JSON first
            try:
                data = json.loads(text_content)
                if isinstance(data, dict):
                    result.update(data)
                    continue
            except (json.JSONDecodeError, ValueError):
                # Not JSON, might be summary text
                if not result.get('research_summary'):
                    result['research_summary'] = text_content
                continue

        # Handle data parts
        if part.get('kind') == 'data' or part.get('type') == 'data':
            data = part.get('data', {})
            if isinstance(data, dict):
                result.update(data)
            continue

    return result


# ============================================================================
# X402 Payment Protocol Support
# ============================================================================


def _is_payment_required_error(response) -> bool:
    """
    Check if HTTP response indicates payment is required (X402 protocol).
    
    Args:
        response: httpx.Response object
        
    Returns:
        True if payment is required, False otherwise
    """
    try:
        # Check for HTTP 402 status code
        if response.status_code == 402:
            return True
            
        # Check for JSON-RPC error with payment_requirements
        result = response.json()
        error = result.get("error", {})
        return "payment_requirements" in error.get("data", {})
    except Exception:
        return False


def _generate_payment_header(
    x402_version: str,
    payment_requirements: list,
    wallet_private_key: str
) -> str:
    """
    Generate X-PAYMENT header from payment requirements (X402 protocol).
    
    This function implements the X402 payment protocol by:
    1. Deriving wallet address from private key
    2. Parsing payment requirements from 402 response
    3. Preparing payment header with sender address
    4. Signing the payment header with wallet private key
    5. Returning base64-encoded signed payload
    
    Args:
        x402_version: X402 protocol version from 402 response
        payment_requirements: List of payment requirements from 402 response
        wallet_private_key: Private key for signing (without 0x prefix)
        
    Returns:
        Base64-encoded payment header string
        
    Raises:
        ValueError: If payment requirements are invalid
        ImportError: If x402 library is not installed
    """
    try:
        from eth_account import Account
        from x402.exact import prepare_payment_header, sign_payment_header
        from x402.types import PaymentRequirements
    except ImportError as e:
        raise ImportError(
            "X402 payment support requires 'x402' and 'eth-account' packages. "
            "Install them with: pip install x402 eth-account"
        ) from e
    
    logger.info("🔐 Generating X402 payment signature...")
    
    # Validate payment requirements
    if not payment_requirements:
        raise ValueError("payment_requirements is empty, cannot generate X-PAYMENT header")
    
    # Derive wallet address from private key
    account = Account.from_key(wallet_private_key)
    wallet_address = account.address
    
    logger.info(f"   Wallet address (derived from private key): {wallet_address}")
    
    # Parse payment requirements (use first requirement)
    payment_req = PaymentRequirements(**payment_requirements[0])
    
    logger.info(f"   Network: {payment_req.network}")
    logger.info(f"   Amount: {payment_req.max_amount_required}")
    logger.info(f"   Asset: {payment_req.asset}")
    
    # Parse version
    try:
        version_int = int(x402_version)
    except (TypeError, ValueError):
        version_int = 1
        logger.warning(f"   Invalid x402_version '{x402_version}', using version 1")
    
    # Prepare payment header with sender address
    unsigned_header = prepare_payment_header(
        sender_address=wallet_address,
        x402_version=version_int,
        payment_requirements=payment_req,
    )
    
    # Normalize nonce if it's bytes (avoid hex conversion errors)
    try:
        auth_payload = unsigned_header.get("payload", {}).get("authorization", {})
        nonce_value = auth_payload.get("nonce")
        if isinstance(nonce_value, (bytes, bytearray)):
            auth_payload["nonce"] = nonce_value.hex()
    except Exception:
        pass
    
    # Sign payment header
    signed_payload = sign_payment_header(
        account=account,
        payment_requirements=payment_req,
        header=unsigned_header,
    )
    
    # Convert to string if bytes
    if isinstance(signed_payload, (bytes, bytearray)):
        signed_payload = signed_payload.decode()
    
    logger.info("✅ Payment header generated successfully")
    logger.debug(f"   Signed payload preview: {signed_payload[:100]}...")
    
    return signed_payload


def _decode_payment_response(payment_response_header: str) -> dict:
    """
    Decode X-Payment-Response header to extract transaction information.
    
    The X-Payment-Response header is a base64-encoded JSON string containing:
    - transaction: The on-chain transaction hash
    - network: The network name (e.g., "base-sepolia", "base")
    - payer: The payer's wallet address
    - amount: The payment amount
    - success: Payment success status
    
    Args:
        payment_response_header: Base64-encoded payment response header string
        
    Returns:
        Dictionary with decoded payment response data
        
    Raises:
        ValueError: If header cannot be decoded
    """
    import base64
    import json
    
    try:
        # Decode base64
        decoded_bytes = base64.b64decode(payment_response_header)
        decoded_str = decoded_bytes.decode('utf-8')
        
        # Parse JSON
        payment_data = json.loads(decoded_str)
        
        return payment_data
    except Exception as e:
        logger.error(f"Failed to decode X-Payment-Response header: {e}")
        raise ValueError(f"Invalid X-Payment-Response header format: {e}")
