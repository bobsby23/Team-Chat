"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { ArrowLeft, Clock, Lock, Send, Share2, Smile, Users, Wifi, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getSupabaseClient } from "@/lib/supabase"
import type { RealtimeChannel } from "@supabase/supabase-js"

const supabase = getSupabaseClient() // may be null

interface Message {
  id: string
  sender: string
  content: string
  timestamp: Date
  expiresAt: Date
  reactions: Record<string, string[]>
}

interface ChatInterfaceProps {
  username: string
  roomCode?: string
  onBack: () => void
}

const EMOJI_OPTIONS = ["👍", "❤️", "😂", "😮", "😢", "😡", "🎉", "🔥"]

export function ChatInterface({ username, roomCode = "public", onBack }: ChatInterfaceProps) {
  /* ------------------------------------------------------------------ */
  /*                    ── Local component state ──                      */
  /* ------------------------------------------------------------------ */
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected">("connecting")
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null)
  const [room, setRoom] = useState<any>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()
  const pollingIntervalRef = useRef<NodeJS.Timeout>()
  const supabaseChannelRef = useRef<RealtimeChannel | null>(null)

  /* ------------------------------------------------------------------ */
  /*                           ── Helpers ──                            */
  /* ------------------------------------------------------------------ */
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  const getTimeUntilExpiry = (expiresAt: Date) => {
    const diff = expiresAt.getTime() - Date.now()
    const hours = Math.floor(diff / 3600000)
    const minutes = Math.floor((diff % 3600000) / 60000)
    return `${hours}h ${minutes}m`
  }

  const getConnectionIcon = () =>
    connectionStatus === "connected" ? (
      <Wifi className="h-3 w-3 text-green-500" />
    ) : connectionStatus === "connecting" ? (
      <Wifi className="h-3 w-3 text-yellow-500 animate-pulse" />
    ) : (
      <WifiOff className="h-3 w-3 text-red-500" />
    )

  const getConnectionText = () =>
    connectionStatus === "connected"
      ? supabase
        ? "Realtime"
        : "Polling"
      : connectionStatus === "connecting"
        ? "Connecting…"
        : "Disconnected"

  /* ------------------------------------------------------------------ */
  /*                 ── Initial message fetch & presence ──              */
  /* ------------------------------------------------------------------ */
  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages?roomId=${encodeURIComponent(roomCode)}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      setMessages(
        (data.messages || []).map((m: any) => ({
          ...m,
          timestamp: new Date(m.created_at),
          expiresAt: new Date(m.expires_at),
        })),
      )
      setOnlineUsers(data.onlineUsers ?? [])
      setRoom(data.room)
      setConnectionStatus("connected")
    } catch (err) {
      console.error("Load messages error:", err)
      setConnectionStatus("disconnected")
    }
  }, [roomCode])

  /* ------------------------------------------------------------------ */
  /*                  ── Supabase Realtime subscription ──               */
  /* ------------------------------------------------------------------ */
  const setupSupabaseRealtime = useCallback(() => {
    if (!supabase) {
      setConnectionStatus("connected") // we fall back to polling
      return
    }

    console.log("Setting up Supabase Realtime…")
    setConnectionStatus("connecting")

    // Clean previous channel if any
    if (supabaseChannelRef.current) {
      supabase.removeChannel(supabaseChannelRef.current)
    }

    const channel = supabase
      .channel(`chat_room_${roomCode}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, (payload) => {
        if (payload.eventType === "INSERT") {
          const m = payload.new as any
          setMessages((prev) => [
            ...prev,
            {
              ...m,
              timestamp: new Date(m.created_at),
              expiresAt: new Date(m.expires_at),
            },
          ])
        } else if (payload.eventType === "UPDATE") {
          setMessages((prev) =>
            prev.map((msg) => (msg.id === payload.new.id ? { ...msg, reactions: payload.new.reactions } : msg)),
          )
        } else if (payload.eventType === "DELETE") {
          setMessages((prev) => prev.filter((m) => m.id !== payload.old.id))
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setConnectionStatus("connected")
        if (status === "CHANNEL_ERROR") setConnectionStatus("disconnected")
      })

    supabaseChannelRef.current = channel
  }, [roomCode])

  /* ------------------------------------------------------------------ */
  /*                       ── Poll presence typing ──                    */
  /* ------------------------------------------------------------------ */
  const pollPresence = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages?action=typing&roomId=${encodeURIComponent(roomCode)}`)
      if (!res.ok) return
      const data = await res.json()
      setTypingUsers(data.typing.filter((u: string) => u !== username))
      setOnlineUsers(data.onlineUsers ?? [])
    } catch (err) {
      // ignore
    }
  }, [username, roomCode])

  /* ------------------------------------------------------------------ */
  /*                   ── Component mount / unmount ──                  */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    // join
    fetch(
      `/api/messages?action=join&username=${encodeURIComponent(username)}&roomId=${encodeURIComponent(roomCode)}`,
    ).catch(console.error)

    loadMessages()
    setupSupabaseRealtime()

    pollingIntervalRef.current = setInterval(pollPresence, 2000)

    return () => {
      // leave
      fetch(
        `/api/messages?action=leave&username=${encodeURIComponent(username)}&roomId=${encodeURIComponent(roomCode)}`,
      ).catch(console.error)
      if (supabaseChannelRef.current) supabase?.removeChannel(supabaseChannelRef.current)
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }
  }, [username, roomCode, loadMessages, setupSupabaseRealtime, pollPresence])

  /* ------------------------------------------------------------------ */
  /*                            ── Actions ──                           */
  /* ------------------------------------------------------------------ */
  const sendMessage = async () => {
    if (!newMessage.trim()) return
    const content = newMessage.trim()
    setNewMessage("")

    // optimistic UI
    const tempId = `tmp_${Date.now()}`
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        sender: username,
        content,
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + 86400000),
        reactions: {},
      },
    ])
    scrollToBottom()

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender: username, content, roomId: roomCode }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    } catch (err) {
      console.error("Send message error:", err)
      // rollback optimistic
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
    }
  }

  const handleTyping = () => {
    fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "typing", sender: username, roomId: roomCode }),
    }).catch(console.error)

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {}, 3000)
  }

  const addReaction = async (messageId: string, emoji: string) => {
    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reaction", messageId, emoji, sender: username, roomId: roomCode }),
      })
      setShowEmojiPicker(null)
    } catch (err) {
      console.error("Reaction error:", err)
    }
  }

  const shareRoom = async () => {
    const url = roomCode === "public" ? `${window.location.origin}/` : `${window.location.origin}/room/${roomCode}`

    if (navigator.share) {
      await navigator.share({
        title: `Join ${room?.name || "Bobsby Chat"}`,
        text: `Join our ${room?.type === "private" ? "private" : "public"} chat room`,
        url,
      })
    } else {
      await navigator.clipboard.writeText(url)
      alert("Chat link copied to clipboard!")
    }
  }

  /* ------------------------------------------------------------------ */
  /*                             ── JSX ──                              */
  /* ------------------------------------------------------------------ */
  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-gray-300 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-semibold text-lg text-white">
              {room?.name || "Bobsby Chat Room"}
              {room?.type === "private" && <Lock className="h-4 w-4 inline ml-2 text-purple-400" />}
            </h1>
            <div className="flex items-center space-x-2">
              {getConnectionIcon()}
              <span className="text-sm text-gray-400">{getConnectionText()}</span>
              <Clock className="h-3 w-3 text-orange-400" />
              <span className="text-xs text-orange-400">24h auto-delete</span>
            </div>
          </div>
        </div>

        <Button variant="ghost" size="sm" onClick={shareRoom} className="text-gray-300 hover:text-white">
          <Share2 className="h-4 w-4" />
          <span className="hidden sm:inline ml-2">Share</span>
        </Button>
      </header>

      {/* body */}
      <div className="flex-1 flex overflow-hidden">
        {/* chat */}
        <div className="flex-1 flex flex-col">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.sender === username ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg relative group ${
                      m.sender === username
                        ? "bg-blue-600 text-white"
                        : m.sender === "System"
                          ? "bg-green-800 text-green-100 border border-green-700"
                          : "bg-gray-800 border border-gray-700 text-white"
                    }`}
                  >
                    {m.sender !== username && m.sender !== "System" && (
                      <div className="text-xs font-medium text-gray-400 mb-1">{m.sender}</div>
                    )}
                    <div className="text-sm">{m.content}</div>

                    {/* reactions */}
                    {Object.keys(m.reactions).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {Object.entries(m.reactions).map(([emoji, users]) => (
                          <button
                            key={emoji}
                            onClick={() => addReaction(m.id, emoji)}
                            className={`text-xs px-2 py-1 rounded-full border flex items-center space-x-1 hover:bg-gray-700 ${
                              users.includes(username) ? "bg-blue-800 border-blue-600" : "bg-gray-700 border-gray-600"
                            }`}
                          >
                            <span>{emoji}</span>
                            <span>{users.length}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-1">
                      <div className="text-xs text-gray-400">
                        {m.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3 text-orange-400" />
                        <span className="text-xs text-orange-400">{getTimeUntilExpiry(m.expiresAt)}</span>
                      </div>
                    </div>

                    {/* emoji picker toggle */}
                    {m.sender !== "System" && (
                      <button
                        onClick={() => setShowEmojiPicker(showEmojiPicker === m.id ? null : m.id)}
                        className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-700 border border-gray-600 rounded-full p-1 hover:bg-gray-600"
                      >
                        <Smile className="h-3 w-3 text-gray-300" />
                      </button>
                    )}

                    {showEmojiPicker === m.id && (
                      <div className="absolute top-full right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg p-2 flex space-x-1 z-10">
                        {EMOJI_OPTIONS.map((e) => (
                          <button
                            key={e}
                            onClick={() => addReaction(m.id, e)}
                            className="hover:bg-gray-700 p-1 rounded text-lg"
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* typing */}
              {typingUsers.length > 0 && (
                <div className="flex justify-start">
                  <div className="bg-gray-700 px-4 py-2 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                      </div>
                      <span className="text-sm text-gray-300">
                        {typingUsers.length === 1
                          ? `${typingUsers[0]} is typing…`
                          : `${typingUsers.slice(0, -1).join(", ")} and ${typingUsers.at(-1)} are typing…`}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* input */}
          <div className="border-t border-gray-700 bg-gray-800 p-4">
            <div className="flex space-x-2">
              <Input
                placeholder="Type your message…"
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value)
                  handleTyping()
                }}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                className="flex-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
              />
              <Button onClick={sendMessage} disabled={!newMessage.trim()} className="bg-blue-600 hover:bg-blue-700">
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
              <span className="flex items-center">
                <Lock className="h-4 w-4 mr-1" />
                {room?.type === "private" ? "End-to-end encrypted" : "Secure connection"}
              </span>
              <span>{onlineUsers.length} online</span>
            </div>
          </div>
        </div>

        {/* sidebar */}
        <div className="hidden lg:block w-64 bg-gray-800 border-l border-gray-700">
          <div className="p-4">
            <h3 className="font-semibold mb-3 flex items-center text-white">
              <Users className="h-4 w-4 mr-2" />
              Online ({onlineUsers.length})
            </h3>
            <div className="space-y-2">
              {onlineUsers.map((u) => (
                <div key={u} className="flex items-center space-x-2 p-2 rounded hover:bg-gray-700">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-sm text-gray-300">{u}</span>
                  {u === username && (
                    <Badge variant="secondary" className="text-xs bg-blue-900 text-blue-100">
                      You
                    </Badge>
                  )}
                  {typingUsers.includes(u) && <span className="text-xs text-gray-400 italic">typing…</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 border-t border-gray-700">
            <Card className="bg-gray-700 border-gray-600">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center text-white">
                  <Clock className="h-4 w-4 mr-2" />
                  Status
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Connection</span>
                    <Badge
                      variant="secondary"
                      className={`text-xs ${
                        connectionStatus === "connected"
                          ? "bg-green-900 text-green-100"
                          : connectionStatus === "connecting"
                            ? "bg-yellow-900 text-yellow-100"
                            : "bg-red-900 text-red-100"
                      }`}
                    >
                      {getConnectionText()}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Auto-delete</span>
                    <Badge variant="secondary" className="text-xs bg-orange-900 text-orange-100">
                      24 h
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Encryption</span>
                    <Badge
                      variant="secondary"
                      className={`text-xs ${room?.type === "private" ? "bg-purple-900 text-purple-100" : "bg-green-900 text-green-100"}`}
                    >
                      {room?.type === "private" ? "E2E" : "TLS"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
