import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase"

// In-memory storage for typing users and online users (still limited by serverless instances)
// For true persistence and real-time presence, Supabase Presence would be needed.
const typingUsers: Record<string, { username: string; timestamp: number }> = {}
const onlineUsers = new Set<string>()

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const action = searchParams.get("action")
  const username = searchParams.get("username")
  const supabase = getSupabaseServerClient() // Get server-side client

  if (!supabase) {
    console.error("Supabase server client is null. Cannot process API request.")
    return NextResponse.json({ error: "Supabase not configured on server" }, { status: 500 })
  }

  if (action === "join" && username) {
    onlineUsers.add(username)
    console.log(`👋 User joined: ${username}, total online: ${onlineUsers.size}`)
    // In a real app, you'd update a 'presence' table in Supabase
    return NextResponse.json({ success: true, onlineUsers: Array.from(onlineUsers) })
  }

  if (action === "leave" && username) {
    onlineUsers.delete(username)
    console.log(`👋 User left: ${username}, total online: ${onlineUsers.size}`)
    // In a real app, you'd update a 'presence' table in Supabase
    return NextResponse.json({ success: true })
  }

  if (action === "typing") {
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

  // Fetch messages from Supabase, ordered by creation time
  const { data: messages, error } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(100) // Limit to last 100 messages

  if (error) {
    console.error("❌ Error fetching messages from Supabase:", error)
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 })
  }

  // Filter out expired messages on the server-side before sending
  const now = new Date()
  const filteredMessages = messages.filter((msg) => new Date(msg.expires_at) > now)

  console.log(`📋 Returning ${filteredMessages.length} messages from Supabase`)
  return NextResponse.json({
    messages: filteredMessages,
    onlineUsers: Array.from(onlineUsers),
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, sender, content, messageId, emoji } = body
    const supabase = getSupabaseServerClient() // Get server-side client

    if (!supabase) {
      console.error("Supabase server client is null. Cannot process API request.")
      return NextResponse.json({ error: "Supabase not configured on server" }, { status: 500 })
    }

    if (action === "typing") {
      if (sender) {
        typingUsers[sender] = {
          username: sender,
          timestamp: Date.now(),
        }
        // No broadcast needed here, client polls for typing status
      }
      return NextResponse.json({ success: true })
    }

    if (action === "reaction") {
      if (!messageId || !emoji || !sender) {
        return NextResponse.json({ error: "Missing messageId, emoji, or sender" }, { status: 400 })
      }

      // Fetch the message to update its reactions
      const { data: existingMessage, error: fetchError } = await supabase
        .from("messages")
        .select("reactions")
        .eq("id", messageId)
        .single()

      if (fetchError || !existingMessage) {
        console.error("❌ Error fetching message for reaction:", fetchError)
        return NextResponse.json({ error: "Message not found" }, { status: 404 })
      }

      const currentReactions = existingMessage.reactions || {}
      if (!currentReactions[emoji]) {
        currentReactions[emoji] = []
      }

      // Toggle reaction
      const userIndex = currentReactions[emoji].indexOf(sender)
      if (userIndex > -1) {
        currentReactions[emoji].splice(userIndex, 1)
        if (currentReactions[emoji].length === 0) {
          delete currentReactions[emoji]
        }
      } else {
        currentReactions[emoji].push(sender)
      }

      // Update reactions in Supabase
      const { data: updatedMessage, error: updateError } = await supabase
        .from("messages")
        .update({ reactions: currentReactions })
        .eq("id", messageId)
        .select()
        .single()

      if (updateError || !updatedMessage) {
        console.error("❌ Error updating reaction in Supabase:", updateError)
        return NextResponse.json({ error: "Failed to update reaction" }, { status: 500 })
      }

      console.log(`👍 Reaction ${emoji} by ${sender} on message ${messageId}`)
      return NextResponse.json({ message: updatedMessage })
    }

    if (!sender || !content) {
      return NextResponse.json({ error: "Missing sender or content" }, { status: 400 })
    }

    onlineUsers.add(sender) // Still in-memory for now

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours

    // Insert new message into Supabase
    const { data: newMessage, error } = await supabase
      .from("messages")
      .insert({
        sender,
        content,
        expires_at: expiresAt,
        reactions: {}, // Initialize empty reactions
      })
      .select() // Select the inserted row to get its ID and other defaults
      .single()

    if (error || !newMessage) {
      console.error("❌ Error inserting message into Supabase:", error)
      return NextResponse.json({ error: "Failed to send message" }, { status: 500 })
    }

    console.log(`💬 New message from ${sender}: "${content}" (ID: ${newMessage.id})`)

    return NextResponse.json({ message: newMessage, success: true })
  } catch (error) {
    console.error("❌ Error in POST /api/messages:", error)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}

export async function DELETE() {
  const supabase = getSupabaseServerClient()
  if (!supabase) {
    console.error("Supabase server client is null. Cannot process API request.")
    return NextResponse.json({ error: "Supabase not configured on server" }, { status: 500 })
  }

  const now = new Date().toISOString()

  // Delete expired messages from Supabase
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
