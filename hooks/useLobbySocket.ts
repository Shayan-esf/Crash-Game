import { useCallback, useEffect, useRef, useState } from 'react';

export interface LobbyEvent {
  type: string;
  [key: string]: any;
}

export interface ChatMessage {
  userId: string;
  username: string;
  avatarUrl?: string;
  message: string;
  createdAt: number;
}

export function useLobbySocket({ initData }: { initData: string }) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [lobbyEvents, setLobbyEvents] = useState<LobbyEvent[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [sessionHistory, setSessionHistory] = useState<Array<{ multiplier: number; timestamp: number }>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // بستن اتصال قبلی در صورت وجود
    if (wsRef.current) {
      wsRef.current.close();
    }
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || `ws://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:4001`;
    console.log('[useLobbySocket] Connecting to WebSocket URL:', wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[useLobbySocket] Connected to WebSocket server');
      setConnected(true);
      setError(null);
      ws.send(JSON.stringify({ type: 'auth', initData: initData || 'dev' }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[useLobbySocket] Received message:', data.type);
        if (data.type === 'auth-success') {
          console.log('[useLobbySocket] Auth success, user:', data.user);
          setUser(data.user);
          setConnected(true);
          setError(null);
        } else if (data.type === 'session-history') {
          setSessionHistory(data.history || []);
        } else if (data.type === 'balance-update') {
          setLobbyEvents((prev) => [...prev.slice(-99), data]);
        } else if (data.type === 'chat-message') {
          setChatMessages((prev) => [...prev.slice(-99), data]);
        } else if (data.error) {
          console.warn('[useLobbySocket] Server returned error:', data.error);
          setError(data.error);
        } else {
          setLobbyEvents((prev) => [...prev.slice(-99), data]);
        }
      } catch (e) {
        setError('خطا در پردازش پیام سرور');
      }
    };

    ws.onclose = (e) => {
      console.warn('[useLobbySocket] WebSocket closed:', e.code, e.reason);
      setConnected(false);
      setUser(null);
    };

    ws.onerror = (e) => {
      console.error('[useLobbySocket] WebSocket error:', e);
      setConnected(false);
      setError('WebSocket error');
    };

    return () => {
      ws.close();
    };
  }, [initData]);

  // ارسال پیام به چت
  const sendChat = useCallback((message: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'chat-message', message }));
  }, []);

  // ارسال شرط
  const sendBet = useCallback((bet: number, theme?: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'bet', bet, theme }));
  }, []);

  // ارسال درخواست کش‌اوت (برداشت سود)
  const sendCashout = useCallback((betAmount: number) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'cashout', betAmount }));
  }, []);

  // سایر رویدادهای بازی (شروع، کرش و ...)
  const sendGameEvent = useCallback((event: LobbyEvent) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify(event));
  }, []);

  // ارسال ری‌اکشن آیکونی زنده روی موشک با ضریب مشخص
  const sendReaction = useCallback((reaction: 'rocket' | 'flame' | 'zap' | 'trophy', multiplier?: number) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'reaction', reaction, multiplier }));
  }, []);

  return {
    connected,
    error,
    user,
    lobbyEvents,
    chatMessages,
    sessionHistory,
    sendChat,
    sendBet,
    sendCashout,
    sendGameEvent,
    sendReaction,
  };
} 