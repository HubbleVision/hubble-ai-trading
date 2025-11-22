"""
Futures trader agent.

Executes trades based on the portfolio manager's plan with full autonomy.
Uses single-pass execution with tool binding for maximum flexibility.

Architecture: Agent-Centric - LLM autonomously decides tool calls and execution flow.
"""

from loguru import logger
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from tradingagents.agents.utils.analysis_recorder import record_agent_execution


def create_trader(llm):
    """
    Construct the futures trader node.
    
    Uses optimized single-pass execution:
    - LLM autonomously calls tools as needed
    - No manual state machine
    - Maximum flexibility for handling edge cases
    
    Args:
        llm: Language model instance.
        
    Returns:
        Trader node callable.
    """
    
    def trader_node(state):
        symbol = state["trading_symbol"]
        portfolio_plan = state.get("portfolio_plan", "")
        
        if not portfolio_plan:
            raise ValueError("Portfolio plan is required for execution")
        
        # Note: We no longer skip HOLD actions
        # HOLD requires checking if protective orders are still valid
        
        # Import execution tools
        from tradingagents.agents.utils.futures_execution_tools import (
            get_comprehensive_trading_status,
            cancel_order,
            cancel_all_orders_for_symbol,
            open_long_position,
            open_short_position,
            close_position,
            update_sl_tp,
            update_sl_tp_safe,
            reduce_position,
        )
        
        tools = [
            get_comprehensive_trading_status,
            cancel_order,
            cancel_all_orders_for_symbol,
            open_long_position,
            open_short_position,
            close_position,
            update_sl_tp_safe,  # Use safe version with built-in safety checks
            reduce_position,
        ]
        
        # Build comprehensive trader prompt
        # This guides the LLM through systematic execution while preserving autonomy
        system_message = f"""You are the **Futures Trader Agent**. Execute the portfolio plan autonomously and systematically.

⚠️ **Account Configuration**: Multi-Assets (Cross Margin) mode is active. Isolated margin may not be available.

**📋 PORTFOLIO PLAN TO EXECUTE:**
{portfolio_plan}

---

**🎯 EXECUTION WORKFLOW:**

**Phase 1: Prepare Trading Environment** 🛡️

⚠️ **MANDATORY FIRST STEP:**

1. **Call `prepare_trading_environment()`** with parameters from the portfolio plan:
   - symbol: "{symbol}"
   - new_action: [DECISION from portfolio plan - "LONG"/"SHORT"/"HOLD"/"EXIT"/"REDUCE"]
   - stop_loss_price: [from portfolio plan]
   - take_profit_price: [from portfolio plan]

2. **This tool automatically handles**:
   - ✅ Gets current trading status (position, orders, account)
   - ✅ Verifies and fixes SL/TP protection if needed
   - ✅ Cleans up stale orders based on your action
   - ✅ Detects direction reversals and handles appropriately

3. **Review the tool's response**:
   - Check `ready` field: Is environment safe to proceed?
   - Review `actions_taken`: What was prepared/fixed?
   - Review `warnings`: Any issues that need your attention?

**Phase 2: Intelligent Decision** 🧠

Based on the environment preparation result:

**If `ready: true` and no serious warnings:**
→ Proceed to Phase 3 (execute the trade)

**If `ready: false` or serious warnings exist:**
→ Use your judgment:
  - **Minor warnings** (e.g., "Old order already cancelled", "SL/TP already optimal"):
    * These are informational, safe to proceed
  - **Serious warnings** (e.g., "Failed to fix protection", "API error"):
    * Consider aborting the trade
    * Generate a safety report explaining the issue
    * Do NOT proceed with risky operations

**If `is_reversing: true` in status:**
→ Must call `close_position("{symbol}")` first before opening new position in Phase 3

**Phase 3: Execute Trading Action**

Based on the **DECISION** in the portfolio plan and your assessment from Phase 1 & 2:

**If HOLD (and a position exists):**
1. Protection and cleanup were already handled in Phase 1
2. No additional action needed
3. Proceed to Phase 4 to generate report

**If LONG (to open a NEW position):**
1. Environment is already prepared in Phase 1 (cleanup done)
2. Call `open_long_position()` with parameters:
   - symbol: "{symbol}"
   - position_size_usd: [from plan]
   - leverage: [from plan]
   - entry_price: [from plan, or None for MARKET order]
   - stop_loss_price: [from plan]
   - take_profit_price: [from plan - use first TP level]
3. Verify the order was placed successfully
4. Proceed to Phase 4

**If SHORT (to open a NEW position):**
1. Environment is already prepared in Phase 1 (cleanup done)
2. Call `open_short_position()` with parameters:
   - symbol: "{symbol}"
   - position_size_usd: [from plan]
   - leverage: [from plan]
   - entry_price: [from plan, or None for MARKET order]
   - stop_loss_price: [from plan]
   - take_profit_price: [from plan - use first TP level]
3. Verify the order was placed successfully
4. Proceed to Phase 4

**If MODIFY_TP_SL (and a position exists):**
1. Use the `update_sl_tp()` tool with the new prices from the plan to adjust the existing protective orders.
2. Proceed to Phase 4

**If REDUCE:**
1. Call `reduce_position()` with:
   - symbol: "{symbol}"
   - reduce_percentage: [from plan, typically 50%]
2. Verify the reduction was executed
3. Proceed to Phase 4

**If EXIT / CLOSE:**
1. Call `close_position()` with:
   - symbol: "{symbol}"
2. Verify the position was closed
3. Proceed to Phase 4

**Phase 4: Generate Trade Summary**

After all tool calls are complete, output ONLY a concise human-readable summary (no technical details, no structured report):

```
### 💭 Trade Execution Summary

[Write 2-3 sentences in simple, natural language explaining what you just did. Include:
- What action you took (opened/closed position, held, adjusted orders, etc.)
- Key details (position size, entry price, leverage if applicable)
- Current protective orders (stop loss and take profit levels)
- Whether it was successful or if there were any issues

Examples:

**For HOLD**: "Holding the existing long position on BTCUSDT. The position is protected with stop-loss at $69,000 and take-profit at $72,000. No changes were needed as protective orders are already optimal."

**For HOLD with update**: "Holding the long position on BTCUSDT. Updated protective orders: stop-loss moved from $68,500 to $69,000 (tighter) and take-profit adjusted to $72,000. Position is well protected."

**For OPEN LONG**: "Opened a long position on BTCUSDT with 0.5 contracts at $70,500 using 10x leverage ($5,000 position). The position is now protected with stop-loss at $69,500 (-1.4%) and take-profit at $72,000 (+2.1%)."

**For EXIT/CLOSE**: "Closed the entire BTCUSDT short position at market price ($102,500). The position was exited due to trend reversal signal (price broke above SMA-50). All protective orders have been cancelled. Trade complete."

**For ERROR**: "Failed to execute the trade: [reason]. The position remains unchanged and existing protective orders are still active."]
```

---

**⚠️ ERROR HANDLING:**

If any tool call fails:
- Read the error message and explain what went wrong in simple language
- Do NOT retry the same failing operation multiple times
- Always generate a final summary, even if trade execution fails

**🔧 KEY PRINCIPLES:**

1. **Be Systematic**: Follow the phases in order
2. **Be Autonomous**: Make intelligent decisions when needed
3. **Be Concise**: Output only the plain language summary, no technical reports

---

**NOW EXECUTE THE PLAN.** Call the necessary tools and generate a concise trade summary."""
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", "{system_message}"),
            MessagesPlaceholder(variable_name="messages"),
        ])
        
        prompt = prompt.partial(system_message=system_message)
        chain = prompt | llm.bind_tools(tools)
        
        # Single-pass execution: LLM autonomously calls tools until completion
        result = chain.invoke(state["messages"])
        
        # Check if LLM wants to call tools
        # Different LLM providers store tool_calls in different places
        has_tool_calls = False
        if hasattr(result, 'tool_calls') and result.tool_calls:
            has_tool_calls = True
        elif hasattr(result, 'additional_kwargs'):
            additional = getattr(result, 'additional_kwargs', {}) or {}
            if additional.get('tool_calls'):
                has_tool_calls = True
        
        # If LLM is calling tools, return and let ToolNode execute them
        if has_tool_calls:
            logger.debug(f"Trader requesting tool calls for {symbol}")
            return {
                "messages": state["messages"] + [result],
                "sender": "trader",
            }

        # No tool calls - this is the final summary
        full_content = (result.content or "").strip()
        
        # Remove the markdown header if present (for consistency with other agents)
        # LLM outputs: "### 💭 Trade Execution Summary\n\nActual summary..."
        # We want only: "Actual summary..."
        trade_summary = full_content
        if "### 💭 Trade Execution Summary" in full_content:
            parts = full_content.split("### 💭 Trade Execution Summary", 1)
            if len(parts) > 1:
                trade_summary = parts[1].strip()
        elif "Trade Execution Summary" in full_content:
            # Fallback: handle variations
            parts = full_content.split("Trade Execution Summary", 1)
            if len(parts) > 1:
                trade_summary = parts[1].strip()
        
        if not trade_summary:
            logger.warning("Trader returned empty summary; this may indicate an incomplete trade")
            trade_summary = "⚠️ Trade completed but no summary was generated"
        
        logger.info(f"✅ Trade complete for {symbol}")
        logger.debug(f"Summary length: {len(trade_summary)} characters")
        
        # Record execution to external API (only the concise summary)
        record_agent_execution(state, "trader_summary", trade_summary)
        
        return {
            "messages": state["messages"] + [result],
            "trade_report_summary": trade_summary,
            "sender": "trader",
        }
    
    return trader_node
