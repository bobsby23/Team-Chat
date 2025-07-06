import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseServerClient()
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 })
    }

    const body = await request.json()
    const { name, type, inviteCode, encryptionKey, expiresAt, maxParticipants } = body

    // Validate input
    if (!name || !type || !inviteCode) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!["public", "private"].includes(type)) {
      return NextResponse.json({ error: "Invalid room type" }, { status: 400 })
    }

    // Check if invite code already exists
    const { data: existingRoom } = await supabase.from("chat_rooms").select("id").eq("invite_code", inviteCode).single()

    if (existingRoom) {
      return NextResponse.json({ error: "Invite code already exists" }, { status: 409 })
    }

    // Create the room
    const { data: room, error } = await supabase
      .from("chat_rooms")
      .insert({
        name,
        type,
        invite_code: inviteCode,
        encryption_key: encryptionKey,
        expires_at: expiresAt,
        max_participants: maxParticipants,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating room:", error)
      return NextResponse.json({ error: "Failed to create room" }, { status: 500 })
    }

    console.log(`🏠 Created ${type} room: ${name} (${inviteCode})`)
    return NextResponse.json(room)
  } catch (error) {
    console.error("Error in POST /api/rooms:", error)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}

export async function GET() {
  try {
    const supabase = getSupabaseServerClient()
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 })
    }

    // Get all active rooms (excluding private room encryption keys)
    const { data: rooms, error } = await supabase
      .from("chat_rooms")
      .select("id, name, type, invite_code, created_at, expires_at, max_participants, is_active")
      .eq("is_active", true)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching rooms:", error)
      return NextResponse.json({ error: "Failed to fetch rooms" }, { status: 500 })
    }

    return NextResponse.json({ rooms })
  } catch (error) {
    console.error("Error in GET /api/rooms:", error)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
