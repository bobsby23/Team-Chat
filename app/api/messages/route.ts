import { type NextRequest, NextResponse } from "next/server"

// In-memory storage for demo (use Redis or database in production)
let messages: Array<{
  id: string
  sender: string
  content: string
  timestamp: string
  expiresAt: string
  reactions: Record<string, string[]>
}> = []

const typingUsers: Record<string, { username: string; timestamp: number }> = {}
const onlineUsers = new Set<string>()

// Import broadcast function directly
import { broadcastMessage } from "../sse/route"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get("action")
  const username = searchParams.get("username")

  if (action === "join" && username) {
    onlineUsers.add(username)
    console.log(`👋 User joined: ${username}, total online: ${onlineUsers.size}`)

    const broadcastResult = broadcastMessage({
      type: "user_joined",
      username,
      onlineUsers: Array.from(onlineUsers),
      timestamp: Date.now(),
    })

    console.log(`📢 Join broadcast result:`, broadcastResult)
    return NextResponse.json({ success: true })
  }

  if (action === "leave" && username) {
    onlineUsers.delete(username)
    console.log(`👋 User left: ${username}, total online: ${onlineUsers.size}`)

    broadcastMessage({
      type: "user_left",
      username,
      onlineUsers: Array.from(onlineUsers),
      timestamp: Date.now(),
    })

    return NextResponse.json({ success: true })
  }

  if (action === "typing") {
    // Clean up old typing indicators (older than 3 seconds)
    const now = Date.now()
    Object.keys(typingUsers).forEach((key) => {
      if (now - typingUsers[key].timestamp > 3000) {
        delete typingUsers[key]
      }
    })

    return NextResponse.json({
      typing: Object.values(typingUsers).map((t) => t.username),
      onlineUsers: Array.from(onlineUsers),
    })
  }

  // Filter out expired messages
  const now = new Date()
  messages = messages.filter((msg) => new Date(msg.expiresAt) > now)

  console.log(`📋 Returning ${messages.length} messages to client`)
  return NextResponse.json({
    messages,
    onlineUsers: Array.from(onlineUsers),
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, sender, content, messageId, emoji } = body

    if (action === "typing") {
      if (sender) {
        typingUsers[sender] = {
          username: sender,
          timestamp: Date.now(),
        }

        // Broadcast typing update
        broadcastMessage({
          type: "typing_update",
          typing: Object.values(typingUsers).map((t) => t.username),
          timestamp: Date.now(),
        })
      }
      return NextResponse.json({ success: true })
    }

    if (action === "reaction") {
      const message = messages.find((m) => m.id === messageId)
      if (message && emoji && sender) {
        if (!message.reactions[emoji]) {
          message.reactions[emoji] = []
        }

        // Toggle reaction
        const userIndex = message.reactions[emoji].indexOf(sender)
        if (userIndex > -1) {
          message.reactions[emoji].splice(userIndex, 1)
          if (message.reactions[emoji].length === 0) {
            delete message.reactions[emoji]
          }
        } else {
          message.reactions[emoji].push(sender)
        }

        console.log(`👍 Reaction ${emoji} by ${sender} on message ${messageId}`)

        // Broadcast reaction update
        const broadcastResult = broadcastMessage({
          type: "reaction_update",
          message,
          timestamp: Date.now(),
        })

        console.log(`📢 Reaction broadcast result:`, broadcastResult)
        return NextResponse.json({ message })
      }
      return NextResponse.json({ error: "Message not found" }, { status: 404 })
    }

    if (!sender || !content) {
      return NextResponse.json({ error: "Missing sender or content" }, { status: 400 })
    }

    // Add user to online users when they send a message
    onlineUsers.add(sender)

    const message = {
      id: Date.now().toString(),
      sender,
      content,
      timestamp: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      reactions: {} as Record<string, string[]>,
    }

    messages.push(message)

    // Keep only last 100 messages to prevent memory issues
    if (messages.length > 100) {
      messages = messages.slice(-100)
    }

    console.log(`💬 New message from ${sender}: "${content}" (ID: ${message.id})`)

    // Broadcast new message to all connected clients
    const broadcastResult = broadcastMessage({
      type: "new_message",
      message,
      onlineUsers: Array.from(onlineUsers),
      timestamp: Date.now(),
    })

    console.log(`📢 Message broadcast result:`, broadcastResult)

    return NextResponse.json({ message })
  } catch (error) {
    console.error("❌ Error in POST /api/messages:", error)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}

export async function DELETE() {
  // Clean up expired messages
  const now = new Date()
  const beforeCount = messages.length
  messages = messages.filter((msg) => new Date(msg.expiresAt) > now)
  const deletedCount = beforeCount - messages.length

  console.log(`🗑️ Cleaned up ${deletedCount} expired messages`)
  return NextResponse.json({ deletedCount })
}
