"""
Futures market data utilities.

Provides helper functions required for futures market analysis.
"""

from langchain_core.tools import tool
import json
import numpy as np
import pandas as pd
import pandas_ta as ta
from typing import List, Dict
from tradingagents.dataflows.asterdex_futures_api import AsterFuturesClient


# Global client instance - will be set during initialization
_client = None


def initialize_futures_client(api_key: str, api_secret: str, base_url: str = "https://fapi.asterdex.com") -> None:
    """
    Initialize the futures client with explicit configuration.
    
    Args:
        api_key: Exchange API key
        api_secret: Exchange API secret
        base_url: Exchange API base URL
    """
    global _client
    _client = AsterFuturesClient(api_key=api_key, api_secret=api_secret, base_url=base_url)


def get_futures_client() -> AsterFuturesClient:
    """
    Return the futures client instance.
    
    Raises:
        RuntimeError: If client hasn't been initialized
    """
    global _client
    if _client is None:
        raise RuntimeError(
            "Futures client not initialized. "
            "Call initialize_futures_client() before using market tools."
        )
    return _client


def calculate_atr(klines: List[Dict], period: int = 14) -> float:
    """
    Compute the Average True Range (ATR) using the pandas-ta implementation.
    
    Standard ATR uses an exponential moving average (EMA) rather than a
    simple moving average (SMA), providing a more responsive volatility
    signal.
    
    Args:
        klines: Sequence of kline dictionaries.
        period: ATR window length (default 14).
        
    Returns:
        Latest ATR value.
    """
    if len(klines) < period + 1:
        return 0.0
    
    try:
        # Convert to DataFrame
        df = pd.DataFrame(klines)
        
        # Ensure numeric dtype
        df['high'] = pd.to_numeric(df['high'], errors='coerce')
        df['low'] = pd.to_numeric(df['low'], errors='coerce')
        df['close'] = pd.to_numeric(df['close'], errors='coerce')
        
        # Use pandas-ta to compute the EMA-based ATR
        atr_values = ta.atr(
            high=df['high'], 
            low=df['low'], 
            close=df['close'], 
            length=period
        )
        
        # Return the most recent value
        if len(atr_values) > 0 and not pd.isna(atr_values.iloc[-1]):
            return float(atr_values.iloc[-1])
        
    except Exception as e:
        # On failure return 0.0
        print(f"ATR calculation error: {e}")
        return 0.0
    
    return 0.0


def calculate_sma(values: List[float], period: int) -> float:
    """
    Compute a simple moving average via pandas-ta.
    
    Args:
        values: Price series.
        period: SMA window length.
        
    Returns:
        Latest SMA value.
    """
    if len(values) < period:
        return 0.0
    
    try:
        # Convert to Series
        series = pd.Series(values)
        
        # Compute SMA with pandas-ta
        sma_values = ta.sma(series, length=period)
        
        # Return the most recent value
        if len(sma_values) > 0 and not pd.isna(sma_values.iloc[-1]):
            return float(sma_values.iloc[-1])
        
    except Exception as e:
        # Fall back to a simple average on failure
        print(f"SMA calculation error: {e}")
        return float(np.mean(values[-period:]))
    
    return 0.0


def detect_trend(klines: List[Dict], sma_50: float, sma_200: float) -> str:
    """
    Detect trend direction.
    
    Args:
        klines: Kline data.
        sma_50: 50-period SMA.
        sma_200: 200-period SMA.
        
    Returns:
        Trend direction: "UP", "DOWN", or "SIDEWAYS".
    """
    if len(klines) < 2:
        return "SIDEWAYS"
    
    current_price = klines[-1]["close"]
    
    # Compare moving averages first
    if sma_50 > 0 and sma_200 > 0:
        if sma_50 > sma_200 * 1.02 and current_price > sma_50:
            return "UP"
        elif sma_50 < sma_200 * 0.98 and current_price < sma_50:
            return "DOWN"
    
    # Fall back to price change heuristic
    price_change_pct = ((current_price - klines[-20]["close"]) / klines[-20]["close"]) * 100 if len(klines) >= 20 else 0
    
    if price_change_pct > 5:
        return "UP"
    elif price_change_pct < -5:
        return "DOWN"
    
    return "SIDEWAYS"


def detect_volatility_regime(atr: float, price: float) -> str:
    """
    Classify the volatility regime.
    
    Args:
        atr: ATR value.
        price: Current price.
        
    Returns:
        "LOW", "NORMAL", or "HIGH".
    """
    atr_pct = (atr / price) * 100 if price > 0 else 0
    
    if atr_pct < 1.5:
        return "LOW"
    elif atr_pct > 4.0:
        return "HIGH"
    else:
        return "NORMAL"


def analyze_funding_rate_trend(funding_rate_history: List[Dict]) -> str:
    """
    Analyse funding rate trend.
    
    Args:
        funding_rate_history: Funding rate history payload.
        
    Returns:
        Trend label: "BULLISH", "BEARISH", or "NEUTRAL".
    """
    if len(funding_rate_history) < 3:
        return "NEUTRAL"
    
    # Examine recent funding rates
    recent_rates = [float(r["fundingRate"]) for r in funding_rate_history[-8:]]
    avg_rate = np.mean(recent_rates)
    
    # Positive funding implies bullish sentiment; negative implies bearish
    if avg_rate > 0.0001:  # 0.01%
        return "BULLISH"
    elif avg_rate < -0.0001:
        return "BEARISH"
    else:
        return "NEUTRAL"


@tool
def get_futures_market_data(symbol: str, interval: str = "1h", limit: int = 200) -> str:
    """
    Fetch futures market data (klines, mark price, funding data, etc.).
    
    Args:
        symbol: Trading pair, e.g., "BTCUSDT".
        interval: Kline interval (1h, 4h, 1d).
        limit: Number of klines to retrieve.
        
    Returns:
        JSON string with market data.
    """
    try:
        client = get_futures_client()
        
        # 1. Fetch klines
        klines = client.get_klines(symbol, interval, limit)
        
        # 2. Fetch mark price and funding rate
        mark_data = client.get_mark_price(symbol)
        
        # 3. Fetch open interest
        oi_data = client.get_open_interest(symbol)
        
        # 4. Fetch 24-hour ticker stats
        ticker_24hr = client.get_ticker_24hr(symbol)
        
        # Derive key price lists
        closes = [k["close"] for k in klines]
        highs = [k["high"] for k in klines]
        lows = [k["low"] for k in klines]
        
        result = {
            "symbol": symbol,
            "interval": interval,
            "current_price": closes[-1],
            "mark_price": mark_data["mark_price"],
            "index_price": mark_data["index_price"],
            "24h_change_pct": float(ticker_24hr.get("priceChangePercent", 0)),
            "24h_volume": float(ticker_24hr.get("volume", 0)),
            "24h_high": float(ticker_24hr.get("highPrice", 0)),
            "24h_low": float(ticker_24hr.get("lowPrice", 0)),
            "funding_rate": mark_data["funding_rate"],
            "next_funding_time": mark_data["next_funding_time"],
            "open_interest": oi_data["open_interest"],
            "recent_klines": klines[-20:],  # Last 20 klines
        }
        
        return json.dumps(result, indent=2)
        
    except Exception as e:
        return json.dumps({"error": str(e)})


@tool
def get_futures_technical_features(symbol: str, interval: str = "1h") -> str:
    """
    Compute futures technical features (trend, ATR, support/resistance, etc.).
    
    Args:
        symbol: Trading pair.
        interval: Kline interval.
        
    Returns:
        JSON string containing technical metrics.
    """
    try:
        client = get_futures_client()
        
        # Ensure sufficient kline history
        klines = client.get_klines(symbol, interval, 250)
        
        if len(klines) < 50:
            return json.dumps({"error": "Insufficient data"})
        
        # Extract price components
        closes = [k["close"] for k in klines]
        highs = [k["high"] for k in klines]
        lows = [k["low"] for k in klines]
        
        # Compute indicators
        current_price = closes[-1]
        atr_14 = calculate_atr(klines, 14)
        sma_50 = calculate_sma(closes, 50)
        sma_200 = calculate_sma(closes, 200) if len(closes) >= 200 else 0
        
        # Detect trend
        trend = detect_trend(klines, sma_50, sma_200)
        
        # Assess volatility regime
        volatility_regime = detect_volatility_regime(atr_14, current_price)
        
        # Derive simple support/resistance using the latest 50 bars
        recent_highs = highs[-50:]
        recent_lows = lows[-50:]
        resistance_level = max(recent_highs)
        support_level = min(recent_lows)
        
        result = {
            "symbol": symbol,
            "interval": interval,
            "current_price": current_price,
            "trend": {
                "direction": trend,
                "sma_50": sma_50,
                "sma_200": sma_200,
            },
            "volatility": {
                "atr_14": atr_14,
                "atr_pct": (atr_14 / current_price) * 100,
                "regime": volatility_regime,
            },
            "levels": {
                "support": support_level,
                "resistance": resistance_level,
                "distance_to_support_pct": ((current_price - support_level) / current_price) * 100,
                "distance_to_resistance_pct": ((resistance_level - current_price) / current_price) * 100,
            }
        }
        
        return json.dumps(result, indent=2)
        
    except Exception as e:
        return json.dumps({"error": str(e)})


@tool
def get_funding_rate_analysis(symbol: str) -> str:
    """
    Analyse funding rate behaviour.
    
    Args:
        symbol: Trading pair.
        
    Returns:
        JSON string with funding rate analysis.
    """
    try:
        client = get_futures_client()
        
        # Fetch funding rate history
        funding_history = client.get_funding_rate_history(symbol, limit=24)  # Latest 24 periods
        
        if not funding_history:
            return json.dumps({"error": "No funding rate data"})
        
        # Current funding rate
        current_funding = float(funding_history[-1]["fundingRate"])
        
        # Determine trend direction
        trend = analyze_funding_rate_trend(funding_history)
        
        # Compute descriptive statistics
        rates = [float(r["fundingRate"]) for r in funding_history]
        avg_rate = np.mean(rates)
        max_rate = max(rates)
        min_rate = min(rates)
        
        result = {
            "symbol": symbol,
            "current_funding_rate": current_funding,
            "current_funding_rate_pct": current_funding * 100,  # Convert to percentage
            "annualized_rate": current_funding * 365 * 3 * 100,  # Annualized assuming 8h periods
            "trend": trend,
            "statistics": {
                "avg_rate": avg_rate,
                "avg_rate_pct": avg_rate * 100,
                "max_rate": max_rate,
                "min_rate": min_rate,
            },
            "interpretation": {
                "BULLISH": "Positive funding — longs pay shorts; bullish positioning",
                "BEARISH": "Negative funding — shorts pay longs; bearish positioning",
                "NEUTRAL": "Funding near zero — balanced sentiment"
            }[trend],
            "recent_history": funding_history[-8:]  # Most recent 8 entries
        }
        
        return json.dumps(result, indent=2)
        
    except Exception as e:
        return json.dumps({"error": str(e)})


@tool
def get_exchange_trading_rules(symbol: str) -> str:
    """
    Get futures exchange trading rules and limits for a symbol.
    
    This tool fetches futures contract-specific trading constraints from /fapi/v1/exchangeInfo.
    Results are cached by the client, so subsequent calls are fast.
    
    Args:
        symbol: Trading pair, e.g., "BTCUSDT"
        
    Returns:
        JSON string with futures trading rules including:
        - Contract specifications (contract type, size, status)
        - Minimum order size (min_qty)
        - Minimum notional value (min_notional) - the minimum USD value for a trade
        - Price and quantity precision requirements
        - Step sizes for orders
    """
    try:
        client = get_futures_client()
        
        # Fetch symbol filters (cached by client after first call, from futures API)
        filters = client.get_symbol_filters(symbol)
        
        # Get min_notional - prefer NOTIONAL filter (futures) over MIN_NOTIONAL (spot)
        min_notional = filters.get("min_notional", 0.0)
        max_notional = filters.get("max_notional")
        
        result = {
            "symbol": symbol,
            "contract_specs": {
                "contract_type": filters.get("contract_type", ""),
                "contract_size": filters.get("contract_size", 1.0),
                "contract_status": filters.get("contract_status", ""),
                "underlying_type": filters.get("underlying_type", ""),
            },
            "trading_rules": {
                "min_notional": min_notional,
                "max_notional": max_notional,
                "min_qty": filters.get("min_qty", 0.0),
                "step_size": filters.get("step_size", 0.0),
                "tick_size": filters.get("tick_size", 0.0),
                "max_qty": filters.get("max_qty", 0.0),
                "min_price": filters.get("min_price", 0.0),
                "max_price": filters.get("max_price", 0.0),
                "price_precision": filters.get("price_precision", 0),
                "quantity_precision": filters.get("quantity_precision", 0),
            },
            "order_limits": {
                "max_num_orders": filters.get("max_num_orders"),
                "max_num_algo_orders": filters.get("max_num_algo_orders"),
            },
            "explanation": {
                "min_notional": f"Minimum order value must be at least ${filters.get('min_notional', 0.0)} USD",
                "min_qty": f"Minimum quantity is {filters.get('min_qty', 0.0)} contracts",
                "step_size": f"Quantity must be a multiple of {filters.get('step_size', 0.0)}",
                "tick_size": f"Price must be a multiple of {filters.get('tick_size', 0.0)}",
                "contract_size": f"Contract multiplier: {filters.get('contract_size', 1.0)} (futures-specific)",
            },
            "note": f"These are hard exchange limits from /fapi/v1/exchangeInfo (futures API). Orders must satisfy BOTH min_notional (${min_notional}) and min_qty. Use current price to calculate the effective minimum. If min_notional seems too low, verify the API response contains 'NOTIONAL' filter (not 'MIN_NOTIONAL')."
        }
        
        return json.dumps(result, indent=2)
        
    except Exception as e:
        return json.dumps({"error": str(e)})


@tool
def get_open_interest_analysis(symbol: str) -> str:
    """
    Analyse open interest changes.
    
    Args:
        symbol: Trading pair.
        
    Returns:
        JSON string with open interest insights.
    """
    try:
        client = get_futures_client()
        
        # Fetch current open interest
        oi_data = client.get_open_interest(symbol)
        
        # Fetch 24-hour price statistics
        ticker_24hr = client.get_ticker_24hr(symbol)
        price_change_pct = float(ticker_24hr.get("priceChangePercent", 0))
        
        result = {
            "symbol": symbol,
            "open_interest": oi_data["open_interest"],
            "timestamp": oi_data["timestamp"],
            "price_change_24h_pct": price_change_pct,
            "interpretation": ""
        }
        
        # Interpret open interest relative to price change
        # TODO: Requires historical OI series for richer analysis
        if price_change_pct > 2:
            result["interpretation"] = "Price rising; watch if open interest confirms the trend."
        elif price_change_pct < -2:
            result["interpretation"] = "Price falling; monitor whether open interest expands (shorts adding) or contracts (positions exiting)."
        else:
            result["interpretation"] = "Price relatively stable."
        
        return json.dumps(result, indent=2)
        
    except Exception as e:
        return json.dumps({"error": str(e)})


@tool
def get_comprehensive_market_analysis(
    symbol: str,
    primary_interval: str = "1h",
    secondary_intervals: str = "5m,15m"
) -> str:
    """
    Get comprehensive market analysis including multi-timeframe technical features,
    funding rate analysis, open interest data, and orderbook depth in a single call.
    
    This tool consolidates multiple market data requests to improve efficiency.
    It fetches klines for multiple timeframes, calculates all technical indicators,
    and analyzes orderbook depth for liquidity and order flow insights.
    
    Args:
        symbol: Trading pair, e.g., "BTCUSDT"
        primary_interval: Primary timeframe for analysis (default: "1h")
        secondary_intervals: Comma-separated secondary timeframes (default: "5m,15m")
        
    Returns:
        JSON string with comprehensive market analysis including:
        - Basic market data (current price, mark price, 24h stats)
        - Multi-timeframe technical analysis (trend, volatility, support/resistance)
        - Funding rate analysis and history
        - Open interest analysis
        - Orderbook analysis (spread, walls, imbalance, liquidity)
    """
    try:
        client = get_futures_client()
        
        # Parse secondary intervals
        secondary_tf_list = [tf.strip() for tf in secondary_intervals.split(",") if tf.strip()]
        all_intervals = [primary_interval] + secondary_tf_list
        
        # 1. Fetch basic market data once
        mark_data = client.get_mark_price(symbol)
        oi_data = client.get_open_interest(symbol)
        ticker_24hr = client.get_ticker_24hr(symbol)
        funding_history = client.get_funding_rate_history(symbol, limit=24)
        
        # 2. Fetch primary timeframe klines (for recent price action)
        primary_klines = client.get_klines(symbol, primary_interval, 250)
        
        if len(primary_klines) < 50:
            return json.dumps({"error": "Insufficient data for primary interval"})
        
        # Extract basic price info from primary timeframe
        primary_closes = [k["close"] for k in primary_klines]
        current_price = primary_closes[-1]
        
        # 3. Build multi-timeframe technical analysis
        timeframe_analysis = {}
        
        for interval in all_intervals:
            try:
                # Fetch klines for this interval
                klines = client.get_klines(symbol, interval, 250)
                
                if len(klines) < 50:
                    timeframe_analysis[interval] = {"error": "Insufficient data"}
                    continue
                
                # Extract price components
                closes = [k["close"] for k in klines]
                highs = [k["high"] for k in klines]
                lows = [k["low"] for k in klines]
                
                # Calculate indicators
                atr_14 = calculate_atr(klines, 14)
                sma_50 = calculate_sma(closes, 50)
                sma_200 = calculate_sma(closes, 200) if len(closes) >= 200 else 0
                
                # Detect trend
                trend = detect_trend(klines, sma_50, sma_200)
                
                # Assess volatility regime
                volatility_regime = detect_volatility_regime(atr_14, closes[-1])
                
                # Derive support/resistance from recent 50 bars
                recent_highs = highs[-50:]
                recent_lows = lows[-50:]
                resistance_level = max(recent_highs)
                support_level = min(recent_lows)
                
                timeframe_analysis[interval] = {
                    "current_price": closes[-1],
                    "trend": {
                        "direction": trend,
                        "sma_50": sma_50,
                        "sma_200": sma_200,
                    },
                    "volatility": {
                        "atr_14": atr_14,
                        "atr_pct": (atr_14 / closes[-1]) * 100,
                        "regime": volatility_regime,
                    },
                    "levels": {
                        "support": support_level,
                        "resistance": resistance_level,
                        "distance_to_support_pct": ((closes[-1] - support_level) / closes[-1]) * 100,
                        "distance_to_resistance_pct": ((resistance_level - closes[-1]) / closes[-1]) * 100,
                    }
                }
                
            except Exception as e:
                timeframe_analysis[interval] = {"error": str(e)}
        
        # 4. Funding rate analysis
        current_funding = float(funding_history[-1]["fundingRate"]) if funding_history else 0
        funding_trend = analyze_funding_rate_trend(funding_history)
        rates = [float(r["fundingRate"]) for r in funding_history]
        
        funding_analysis = {
            "current_funding_rate": current_funding,
            "current_funding_rate_pct": current_funding * 100,
            "annualized_rate": current_funding * 365 * 3 * 100,
            "trend": funding_trend,
            "statistics": {
                "avg_rate": np.mean(rates),
                "avg_rate_pct": np.mean(rates) * 100,
                "max_rate": max(rates),
                "min_rate": min(rates),
            },
            "interpretation": {
                "BULLISH": "Positive funding — longs pay shorts; bullish positioning",
                "BEARISH": "Negative funding — shorts pay longs; bearish positioning",
                "NEUTRAL": "Funding near zero — balanced sentiment"
            }[funding_trend],
            "recent_history": funding_history[-8:]
        }
        
        # 5. Open interest analysis
        price_change_pct = float(ticker_24hr.get("priceChangePercent", 0))
        oi_interpretation = ""
        if price_change_pct > 2:
            oi_interpretation = "Price rising; watch if open interest confirms the trend."
        elif price_change_pct < -2:
            oi_interpretation = "Price falling; monitor whether open interest expands (shorts adding) or contracts (positions exiting)."
        else:
            oi_interpretation = "Price relatively stable."
        
        open_interest_analysis = {
            "open_interest": oi_data["open_interest"],
            "timestamp": oi_data["timestamp"],
            "price_change_24h_pct": price_change_pct,
            "interpretation": oi_interpretation
        }
        
        # 6. Orderbook analysis
        orderbook_analysis = {}
        try:
            orderbook = client.get_depth(symbol, limit=20)
            bids = [[float(price), float(qty)] for price, qty in orderbook.get("bids", [])]
            asks = [[float(price), float(qty)] for price, qty in orderbook.get("asks", [])]
            
            if bids and asks:
                # Calculate spread
                best_bid = bids[0][0]
                best_ask = asks[0][0]
                spread_abs = best_ask - best_bid
                mid_price = (best_bid + best_ask) / 2
                spread_pct = (spread_abs / mid_price) * 100
                
                # Detect walls
                bid_volumes = [qty for _, qty in bids]
                ask_volumes = [qty for _, qty in asks]
                avg_bid_volume = np.mean(bid_volumes) if bid_volumes else 0
                avg_ask_volume = np.mean(ask_volumes) if ask_volumes else 0
                
                buy_wall_threshold = avg_bid_volume * 3
                sell_wall_threshold = avg_ask_volume * 3
                
                buy_walls = []
                for price, qty in bids[:5]:
                    if qty >= buy_wall_threshold:
                        buy_walls.append({
                            "price": price,
                            "quantity": qty,
                            "distance_pct": ((mid_price - price) / mid_price) * 100
                        })
                
                sell_walls = []
                for price, qty in asks[:5]:
                    if qty >= sell_wall_threshold:
                        sell_walls.append({
                            "price": price,
                            "quantity": qty,
                            "distance_pct": ((price - mid_price) / mid_price) * 100
                        })
                
                # Calculate order imbalance
                total_bid_volume = sum(bid_volumes)
                total_ask_volume = sum(ask_volumes)
                imbalance_ratio = total_bid_volume / total_ask_volume if total_ask_volume > 0 else 999
                
                if imbalance_ratio > 1.5:
                    pressure = "BUY_HEAVY"
                elif imbalance_ratio < 0.67:
                    pressure = "SELL_HEAVY"
                else:
                    pressure = "BALANCED"
                
                # Calculate liquidity within 1%
                def calc_liquidity_1pct(orders, mid, is_bid):
                    total = 0
                    for price, qty in orders:
                        if is_bid and price >= mid * 0.99:
                            total += price * qty
                        elif not is_bid and price <= mid * 1.01:
                            total += price * qty
                    return total
                
                bid_liq_1pct = calc_liquidity_1pct(bids, mid_price, True)
                ask_liq_1pct = calc_liquidity_1pct(asks, mid_price, False)
                avg_liq = (bid_liq_1pct + ask_liq_1pct) / 2
                
                liq_assessment = "HIGH" if avg_liq > 100000 else "MEDIUM" if avg_liq > 20000 else "LOW"
                
                orderbook_analysis = {
                    "spread": {
                        "best_bid": best_bid,
                        "best_ask": best_ask,
                        "best_bid_size": bids[0][1],
                        "best_ask_size": asks[0][1],
                        "spread_absolute": spread_abs,
                        "spread_pct": spread_pct,
                        "mid_price": mid_price
                    },
                    "walls": {
                        "buy_walls_detected": len(buy_walls) > 0,
                        "sell_walls_detected": len(sell_walls) > 0,
                        "buy_walls": buy_walls[:2],
                        "sell_walls": sell_walls[:2]
                    },
                    "imbalance": {
                        "bid_volume": total_bid_volume,
                        "ask_volume": total_ask_volume,
                        "volume_ratio": imbalance_ratio,
                        "pressure": pressure
                    },
                    "liquidity": {
                        "bid_value_1pct": bid_liq_1pct,
                        "ask_value_1pct": ask_liq_1pct,
                        "assessment": liq_assessment
                    }
                }
        except Exception as e:
            orderbook_analysis = {"error": f"Failed to fetch orderbook: {str(e)}"}
        
        # 7. Compile comprehensive result
        result = {
            "symbol": symbol,
            "primary_interval": primary_interval,
            "timestamp": oi_data["timestamp"],
            "market_data": {
                "current_price": current_price,
                "mark_price": mark_data["mark_price"],
                "index_price": mark_data["index_price"],
                "24h_change_pct": price_change_pct,
                "24h_volume": float(ticker_24hr.get("volume", 0)),
                "24h_high": float(ticker_24hr.get("highPrice", 0)),
                "24h_low": float(ticker_24hr.get("lowPrice", 0)),
                "funding_rate": mark_data["funding_rate"],
                "next_funding_time": mark_data["next_funding_time"],
            },
            "timeframe_analysis": timeframe_analysis,
            "funding_analysis": funding_analysis,
            "open_interest_analysis": open_interest_analysis,
            "orderbook_analysis": orderbook_analysis,
            "recent_klines": primary_klines[-20:]  # Last 20 klines from primary timeframe
        }
        
        # Log summary of the comprehensive analysis
        from loguru import logger
        logger.info(f"📊 Comprehensive Market Analysis for {symbol}:")
        logger.info(f"  Primary Interval: {primary_interval}")
        logger.info(f"  Current Price: ${current_price:,.2f}")
        logger.info(f"  24h Change: {price_change_pct}%")
        logger.info(f"  24h Volume: {float(ticker_24hr.get('volume', 0)):,.2f}")
        
        # Timeframes analyzed
        timeframes = list(timeframe_analysis.keys())
        logger.info(f"  Timeframes Analyzed: {', '.join(timeframes)}")
        
        # Orderbook summary
        if orderbook_analysis and 'spread' in orderbook_analysis:
            spread = orderbook_analysis.get('spread', {})
            imbalance = orderbook_analysis.get('imbalance', {})
            liquidity = orderbook_analysis.get('liquidity', {})
            logger.info(f"  Orderbook Spread: ${spread.get('spread_absolute', 'N/A')} ({spread.get('spread_pct', 0):.4f}%)")
            logger.info(f"  Order Pressure: {imbalance.get('pressure', 'N/A')} (Ratio: {imbalance.get('volume_ratio', 0):.2f}:1)")
            total_liq = liquidity.get('bid_value_1pct', 0) + liquidity.get('ask_value_1pct', 0)
            logger.info(f"  Liquidity (1%): {liquidity.get('assessment', 'N/A')} (${total_liq:,.0f})")
        elif orderbook_analysis and 'error' in orderbook_analysis:
            logger.warning(f"  Orderbook: {orderbook_analysis['error']}")
        
        # Funding & OI
        logger.info(f"  Funding Rate: {funding_analysis.get('current_funding_rate_pct', 0):.4f}% ({funding_analysis.get('trend', 'N/A')})")
        logger.info(f"  Open Interest: {open_interest_analysis.get('open_interest', 0):,.2f}")
        logger.info(f"  K-lines: {len(primary_klines[-20:])} bars included")
        
        return json.dumps(result, indent=2)
        
    except Exception as e:
        return json.dumps({"error": str(e)})
