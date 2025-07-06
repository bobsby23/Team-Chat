import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase"
import { ChatEncryption } from "@/lib/encryption"

// In-memory storage for typing users and online users per room
const typingUsers: Record<string, Record<string, { username: string; timestamp: number }>> = {}
const onlineUsers: Record<string, Set<string>> = {}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get("action")
  const username = searchParams.get("username")
  const roomId = searchParams.get("roomId") || "public"
  const supabase = getSupabaseServerClient()

  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured on server" }, { status: 500 })
  }

  if (action === "join" && username) {
    if (!onlineUsers[roomId]) onlineUsers[roomId] = new Set()
    onlineUsers[roomId].add(username)
    console.log(`👋 User joined room ${roomId}: ${username}, total online: ${onlineUsers[roomId].size}`)
    return NextResponse.json({ success: true, onlineUsers: Array.from(onlineUsers[roomId] || []) })
  }

  if (action === "leave" && username) {
    if (onlineUsers[roomId]) {
      onlineUsers[roomId].delete(username)
      console.log(`👋 User left room ${roomId}: ${username}, total online: ${onlineUsers[roomId].size}`)
    }
    return NextResponse.json({ success: true })
  }

  if (action === "typing") {
    if (!typingUsers[roomId]) typingUsers[roomId] = {}
    const now = Date.now()
    Object.keys(typingUsers[roomId]).forEach((key) => {
      if (now - typingUsers[roomId][key].timestamp > 3000) {
        delete typingUsers[roomId][key]
      }
    })
    return NextResponse.json({
      typing: Object.values(typingUsers[roomId] || {}).map((t) => t.username),
      onlineUsers: Array.from(onlineUsers[roomId] || []),
    })
  }

  // Get room info first
  const { data: room } = await supabase.from("chat_rooms").select("*").eq("invite_code", roomId).single()

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 })
  }

  // Fetch messages for this room
  const { data: messages, error } = await supabase
    .from("messages")
    .select("*")
    .eq("room_id", room.id)
    .order("created_at", { ascending: true })
    .limit(100)

  if (error) {
    console.error("❌ Error fetching messages from Supabase:", error)
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 })
  }

  // Decrypt messages if it's a private room
  let processedMessages = messages || []
  if (room.type === "private" && room.encryption_key) {
    processedMessages = await Promise.all(
      messages.map(async (msg) => ({
        ...msg,
        content: await ChatEncryption.decryptMessage(msg.content, room.encryption_key),
      })),
    )
  }

  // Filter out expired messages
  const now = new Date()
  const filteredMessages = processedMessages.filter((msg) => new Date(msg.expires_at) > now)

  console.log(`📋 Returning ${filteredMessages.length} messages from room ${room.name}`)
  return NextResponse.json({
    messages: filteredMessages,
    onlineUsers: Array.from(onlineUsers[roomId] || []),
    room,
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, sender, content, messageId, emoji, roomId = "public" } = body
    const supabase = getSupabaseServerClient()

    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured on server" }, { status: 500 })
    }

    if (action === "typing") {
      if (sender) {
        if (!typingUsers[roomId]) typingUsers[roomId] = {}
        typingUsers[roomId][sender] = {
          username: sender,
          timestamp: Date.now(),
        }
      }
      return NextResponse.json({ success: true })
    }

    if (action === "reaction") {
      if (!messageId || !emoji || !sender) {
        return NextResponse.json({ error: "Missing messageId, emoji, or sender" }, { status: 400 })
      }

      const { data: existingMessage, error: fetchError } = await supabase
        .from("messages")
        .select("reactions")
        .eq("id", messageId)
        .single()

      if (fetchError || !existingMessage) {
        return NextResponse.json({ error: "Message not found" }, { status: 404 })
      }

      const currentReactions = existingMessage.reactions || {}
      if (!currentReactions[emoji]) {
        currentReactions[emoji] = []
      }

      const userIndex = currentReactions[emoji].indexOf(sender)
      if (userIndex > -1) {
        currentReactions[emoji].splice(userIndex, 1)
        if (currentReactions[emoji].length === 0) {
          delete currentReactions[emoji]
        }
      } else {
        currentReactions[emoji].push(sender)
      }

      const { data: updatedMessage, error: updateError } = await supabase
        .from("messages")
        .update({ reactions: currentReactions })
        .eq("id", messageId)
        .select()
        .single()

      if (updateError || !updatedMessage) {
        return NextResponse.json({ error: "Failed to update reaction" }, { status: 500 })
      }

      return NextResponse.json({ message: updatedMessage })
    }

    if (!sender || !content) {
      return NextResponse.json({ error: "Missing sender or content" }, { status: 400 })
    }

    // Get room info
    const { data: room } = await supabase.from("chat_rooms").select("*").eq("invite_code", roomId).single()

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 })
    }

    if (!onlineUsers[roomId]) onlineUsers[roomId] = new Set()
    onlineUsers[roomId].add(sender)

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

    // Encrypt content if it's a private room
    let messageContent = content
    if (room.type === "private" && room.encryption_key) {
      messageContent = await ChatEncryption.encryptMessage(content, room.encryption_key)
    }

    const { data: newMessage, error } = await supabase
      .from("messages")
      .insert({
        sender,
        content: messageContent,
        expires_at: expiresAt,
        reactions: {},
        room_id: room.id,
      })
      .select()
      .single()

    if (error || !newMessage) {
      console.error("❌ Error inserting message into Supabase:", error)
      return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
    }

    console.log(`💬 New message in ${room.name} from ${sender}`)

    // Return the message with decrypted content for the response
    const responseMessage = {
      ...newMessage,
      content: content, // Return original content, not encrypted
    }

    return NextResponse.json({ message: responseMessage, success: true })
  } catch (error) {
    console.error("❌ Error in POST /api/messages:", error)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}

export async function DELETE() {
  const supabase = getSupabaseServerClient()
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured on server" }, { status: 500 })
  }

  const now = new Date().toISOString()

  const { count, error } = await supabase
    .from("messages")
    .delete()
    .lt("expires_at", now)
    .select("*", { count: "exact" })

  if (error) {
    console.error("❌ Error deleting expired messages from Supabase:", error)
    return NextResponse.json({ error: "Failed to delete expired messages" }, { status: 500 })
  }

  console.log(`🗑️ Cleaned up ${count || 0} expired messages from Supabase`)
  return NextResponse.json({ deletedCount: count || 0 })
}
