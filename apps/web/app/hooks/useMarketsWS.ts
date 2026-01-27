"use client";

import { useEffect, useState, useRef, useCallback } from "react";

export interface MarketRow {
  exchange: string;
  symbol: string;
  bid: number;
  ask: number;
  ts: number;
}

export type MarketStatus = "connecting" | "live" | "disconnected" | "error";

export interface UseMarketsWSResult {
  rows: MarketRow[];
  status: MarketStatus;
  lastUpdated: number | null;
  errors: string[];
}

const DEFAULT_WS_URL = "ws://localhost:4000/ws";
const RECONNECT_INITIAL_DELAY = 1000; // 1 second
const RECONNECT_MAX_DELAY = 30000; // 30 seconds
const RECONNECT_MULTIPLIER = 1.5;

export function useMarketsWS(): UseMarketsWSResult {
  const [rows, setRows] = useState<MarketRow[]>([]);
  const [status, setStatus] = useState<MarketStatus>("connecting");
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectDelayRef = useRef<number>(RECONNECT_INITIAL_DELAY);
  const isManualCloseRef = useRef<boolean>(false);

  const connect = useCallback(() => {
    // Clear any existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Clear any pending reconnect
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || DEFAULT_WS_URL;
    
    try {
      setStatus("connecting");
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected");
        setStatus("live");
        setErrors([]);
        reconnectDelayRef.current = RECONNECT_INITIAL_DELAY; // Reset delay on successful connection
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === "snapshot" || message.type === "tick") {
            if (Array.isArray(message.data)) {
              setRows(message.data);
              setLastUpdated(Date.now());
              setStatus("live");
              setErrors([]);
            }
          }
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
          setErrors([`Failed to parse message: ${error instanceof Error ? error.message : String(error)}`]);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setStatus("error");
        setErrors(["WebSocket connection error"]);
      };

      ws.onclose = (event) => {
        console.log("WebSocket closed", event.code, event.reason);
        wsRef.current = null;
        
        // Only reconnect if it wasn't a manual close
        if (!isManualCloseRef.current) {
          setStatus("disconnected");
          
          // Exponential backoff reconnection
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectDelayRef.current = Math.min(
              reconnectDelayRef.current * RECONNECT_MULTIPLIER,
              RECONNECT_MAX_DELAY
            );
            connect();
          }, reconnectDelayRef.current);
        } else {
          setStatus("disconnected");
        }
      };
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
      setStatus("error");
      setErrors([`Failed to connect: ${error instanceof Error ? error.message : String(error)}`]);
      
      // Try to reconnect after delay
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectDelayRef.current = Math.min(
          reconnectDelayRef.current * RECONNECT_MULTIPLIER,
          RECONNECT_MAX_DELAY
        );
        connect();
      }, reconnectDelayRef.current);
    }
  }, []);

  useEffect(() => {
    isManualCloseRef.current = false;
    connect();

    return () => {
      isManualCloseRef.current = true;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [connect]);

  return { rows, status, lastUpdated, errors };
}
