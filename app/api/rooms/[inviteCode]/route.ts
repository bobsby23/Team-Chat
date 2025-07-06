import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase"

export async function GET(request: NextRequest, { params }: { params: { inviteCode: string } }) {
  try {
    const supabase = getSupabaseServerClient()
    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 500 })
    }

    const { inviteCode } = params

    // Get room by invite code
    const { data: room, error } = await supabase
      .from("chat_rooms")
      .select("*")
      .eq("invite_code", inviteCode)
      .eq("is_active", true)
      .single()

    if (error || !room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 })
    }

    // Check if room has expired
    if (room.expires_at && new Date(room.expires_at) < new Date()) {
      return NextResponse.json({ error: "Room has expired" }, { status: 410 })
    }

    console.log(`🔍 Room accessed: ${room.name} (${inviteCode})`)
    return NextResponse.json(room)
  } catch (error) {
    console.error("Error in GET /api/rooms/[inviteCode]:", error)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
