"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ArrowLeft, Send, Users, Share2, Lock, Clock, Smile, Wifi, WifiOff } from "lucide-react"

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
  onBack: () => void
}

const EMOJI_OPTIONS = ["👍", "❤️", "😂", "😮", "😢", "😡", "🎉", "🔥"]

export function ChatInterface({ username, onBack }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isConnected, setIsConnected] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "disconnected" | "error">(
    "connecting",
  )

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()
  const eventSourceRef = useRef<EventSource>()
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const pollingIntervalRef = useRef<NodeJS.Timeout>()
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  const loadMessages = useCallback(async () => {
    try {
      const response = await fetch("/api/messages")
      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const data = await response.json()
      console.log("Loaded messages:", data.messages?.length || 0)

      setMessages(
        (data.messages || []).map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
          expiresAt: new Date(msg.expiresAt),
        })),
      )

      if (data.onlineUsers) {
        setOnlineUsers(data.onlineUsers)
      }
    } catch (error) {
      console.error("Error loading messages:", error)
    }
  }, [])

  const setupSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    console.log("Setting up SSE connection...")
    setConnectionStatus("connecting")

    const eventSource = new EventSource("/api/sse")
    eventSourceRef.current = eventSource

    eventSource.onopen = () => {
      console.log("SSE connection opened")
      setIsConnected(true)
      setConnectionStatus("connected")
      reconnectAttempts.current = 0

      // Clear polling fallback if SSE works
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = undefined
      }
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log(`📨 SSE received: ${data.type}`, data)

        switch (data.type) {
          case "connected":
            console.log(`🔗 SSE handshake complete: ${data.connectionId}`)
            break

          case "new_message":
            console.log(`💬 New message received: "${data.message.content}" from ${data.message.sender}`)
            setMessages((prev) => {
              // Check if message already exists to prevent duplicates
              const exists = prev.some((msg) => msg.id === data.message.id)
              if (exists) {
                console.log(`⚠️ Message ${data.message.id} already exists, skipping`)
                return prev
              }

              const newMessage = {
                ...data.message,
                timestamp: new Date(data.message.timestamp),
                expiresAt: new Date(data.message.expiresAt),
              }

              console.log(`✅ Adding message to state: ${newMessage.id}`)
              return [...prev, newMessage]
            })

            if (data.onlineUsers) {
              setOnlineUsers(data.onlineUsers)
            }
            break

          case "reaction_update":
            console.log(`👍 Reaction update for message: ${data.message.id}`)
            setMessages((prev) =>
              prev.map((msg) => (msg.id === data.message.id ? { ...msg, reactions: data.message.reactions } : msg)),
            )
            break

          case "typing_update":
            const filteredTyping = data.typing.filter((user: string) => user !== username)
            console.log(`⌨️ Typing update:`, filteredTyping)
            setTypingUsers(filteredTyping)
            break

          case "user_joined":
            console.log(`👋 User joined: ${data.username}`)
            if (data.onlineUsers) {
              setOnlineUsers(data.onlineUsers)
            }
            break

          case "user_left":
            console.log(`👋 User left: ${data.username}`)
            if (data.onlineUsers) {
              setOnlineUsers(data.onlineUsers)
            }
            break

          case "ping":
            console.log(`💓 Heartbeat received from server`)
            break

          default:
            console.log(`❓ Unknown SSE message type: ${data.type}`)
        }
      } catch (error) {
        console.error("❌ Error parsing SSE data:", error, event.data)
      }
    }

    eventSource.onerror = (error) => {
      console.error("SSE error:", error)
      setIsConnected(false)
      setConnectionStatus("error")

      // Start polling fallback
      setupPollingFallback()

      // Attempt to reconnect
      if (reconnectAttempts.current < maxReconnectAttempts) {
        reconnectAttempts.current++
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000)
        console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts.current})`)

        reconnectTimeoutRef.current = setTimeout(() => {
          setupSSE()
        }, delay)
      } else {
        console.log("Max reconnection attempts reached, using polling fallback")
        setConnectionStatus("disconnected")
      }
    }
  }, [username])

  const setupPollingFallback = useCallback(() => {
    if (pollingIntervalRef.current) return // Already polling

    console.log("Starting polling fallback")
    pollingIntervalRef.current = setInterval(async () => {
      try {
        // Poll for new messages
        await loadMessages()

        // Poll for typing indicators
        const typingResponse = await fetch("/api/messages?action=typing")
        if (typingResponse.ok) {
          const typingData = await typingResponse.json()
          setTypingUsers(typingData.typing.filter((user: string) => user !== username))
          if (typingData.onlineUsers) {
            setOnlineUsers(typingData.onlineUsers)
          }
        }
      } catch (error) {
        console.error("Polling error:", error)
      }
    }, 2000) // Poll every 2 seconds
  }, [loadMessages, username])

  // Initialize connection
  useEffect(() => {
    // Join the chat room
    fetch(`/api/messages?action=join&username=${encodeURIComponent(username)}`)
      .then(() => console.log("Joined chat room"))
      .catch(console.error)

    // Load initial messages
    loadMessages()

    // Setup SSE connection
    setupSSE()

    return () => {
      // Cleanup
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      // Leave the chat room
      fetch(`/api/messages?action=leave&username=${encodeURIComponent(username)}`).catch(console.error)
    }
  }, [username, loadMessages, setupSSE])

  const sendMessage = async () => {
    if (newMessage.trim()) {
      const messageContent = newMessage.trim()
      console.log(`📤 Sending message: "${messageContent}"`)

      try {
        const response = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sender: username,
            content: messageContent,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          console.log(`✅ Message sent successfully:`, data.message)
          setNewMessage("")
        } else {
          console.error(`❌ Failed to send message: HTTP ${response.status}`)
          // If SSE is not working, add message locally and reload
          if (!isConnected) {
            setTimeout(loadMessages, 500)
          }
        }
      } catch (error) {
        console.error("❌ Error sending message:", error)
      }
    }
  }

  const handleTyping = () => {
    // Send typing indicator
    fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "typing",
        sender: username,
      }),
    }).catch(console.error)

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Stop typing indicator after 3 seconds
    typingTimeoutRef.current = setTimeout(() => {
      // Typing will automatically expire on server
    }, 3000)
  }

  const addReaction = async (messageId: string, emoji: string) => {
    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reaction",
          messageId,
          emoji,
          sender: username,
        }),
      })
      setShowEmojiPicker(null)
    } catch (error) {
      console.error("Error adding reaction:", error)
    }
  }

  const shareRoom = async () => {
    const shareUrl = `${window.location.origin}/join`
    if (navigator.share) {
      await navigator.share({
        title: "Join Bobsby Chat",
        text: "Join our secure chat room",
        url: shareUrl,
      })
    } else {
      await navigator.clipboard.writeText(shareUrl)
      alert("Chat link copied to clipboard!")
    }
  }

  const getTimeUntilExpiry = (expiresAt: Date) => {
    const now = new Date()
    const diff = expiresAt.getTime() - now.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${hours}h ${minutes}m`
  }

  const getConnectionIcon = () => {
    switch (connectionStatus) {
      case "connected":
        return <Wifi className="h-3 w-3 text-green-500" />
      case "connecting":
        return <Wifi className="h-3 w-3 text-yellow-500 animate-pulse" />
      default:
        return <WifiOff className="h-3 w-3 text-red-500" />
    }
  }

  const getConnectionText = () => {
    switch (connectionStatus) {
      case "connected":
        return "Connected"
      case "connecting":
        return "Connecting..."
      case "disconnected":
        return "Offline Mode"
      case "error":
        return "Reconnecting..."
      default:
        return "Disconnected"
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-gray-300 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="font-semibold text-lg text-white">Bobsby Chat Room</h1>
            <div className="flex items-center space-x-2">
              {getConnectionIcon()}
              <span className="text-sm text-gray-400">{getConnectionText()}</span>
              <Clock className="h-3 w-3 text-orange-400" />
              <span className="text-xs text-orange-400">24h auto-delete</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={shareRoom} className="text-gray-300 hover:text-white">
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline ml-2">Share</span>
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === username ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg relative group ${
                      message.sender === username
                        ? "bg-blue-600 text-white"
                        : message.sender === "System"
                          ? "bg-green-800 text-green-100 border border-green-700"
                          : "bg-gray-800 border border-gray-700 text-white"
                    }`}
                  >
                    {message.sender !== username && message.sender !== "System" && (
                      <div className="text-xs font-medium text-gray-400 mb-1">{message.sender}</div>
                    )}
                    <div className="text-sm">{message.content}</div>

                    {/* Reactions */}
                    {Object.keys(message.reactions).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {Object.entries(message.reactions).map(([emoji, users]) => (
                          <button
                            key={emoji}
                            onClick={() => addReaction(message.id, emoji)}
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
                      <div className={`text-xs ${message.sender === username ? "text-blue-200" : "text-gray-400"}`}>
                        {message.timestamp.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3 text-orange-400" />
                        <span className="text-xs text-orange-400">{getTimeUntilExpiry(message.expiresAt)}</span>
                      </div>
                    </div>

                    {/* Reaction Button */}
                    {message.sender !== "System" && (
                      <button
                        onClick={() => setShowEmojiPicker(showEmojiPicker === message.id ? null : message.id)}
                        className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-700 border border-gray-600 rounded-full p-1 shadow-sm hover:bg-gray-600"
                      >
                        <Smile className="h-3 w-3 text-gray-300" />
                      </button>
                    )}

                    {/* Emoji Picker */}
                    {showEmojiPicker === message.id && (
                      <div className="absolute top-full right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg p-2 flex space-x-1 z-10">
                        {EMOJI_OPTIONS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => addReaction(message.id, emoji)}
                            className="hover:bg-gray-700 p-1 rounded text-lg"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Typing Indicators */}
              {typingUsers.length > 0 && (
                <div className="flex justify-start">
                  <div className="bg-gray-700 px-4 py-2 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-300">
                        {typingUsers.length === 1
                          ? `${typingUsers[0]} is typing...`
                          : `${typingUsers.slice(0, -1).join(", ")} and ${typingUsers[typingUsers.length - 1]} are typing...`}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="border-t border-gray-700 bg-gray-800 p-4">
            <div className="flex space-x-2">
              <Input
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value)
                  handleTyping()
                }}
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                className="flex-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
              />
              <Button onClick={sendMessage} disabled={!newMessage.trim()} className="bg-blue-600 hover:bg-blue-700">
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
              <span className="flex items-center">
                <Lock className="h-3 w-3 mr-1" />
                Secure connection
              </span>
              <span>{onlineUsers.length} online</span>
            </div>
          </div>
        </div>

        {/* Sidebar (hidden on mobile) */}
        <div className="hidden lg:block w-64 bg-gray-800 border-l border-gray-700">
          <div className="p-4">
            <h3 className="font-semibold mb-3 flex items-center text-white">
              <Users className="h-4 w-4 mr-2" />
              Online ({onlineUsers.length})
            </h3>
            <div className="space-y-2">
              {onlineUsers.map((user) => (
                <div key={user} className="flex items-center space-x-2 p-2 rounded hover:bg-gray-700">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-sm text-gray-300">{user}</span>
                  {user === username && (
                    <Badge variant="secondary" className="text-xs bg-blue-900 text-blue-100">
                      You
                    </Badge>
                  )}
                  {typingUsers.includes(user) && <span className="text-xs text-gray-400 italic">typing...</span>}
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
                      24 hours
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Reactions</span>
                    <Badge variant="secondary" className="text-xs bg-purple-900 text-purple-100">
                      Enabled
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
