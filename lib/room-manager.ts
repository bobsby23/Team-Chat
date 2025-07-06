// Room management utilities
export interface ChatRoom {
  id: string
  name: string
  type: "public" | "private"
  inviteCode: string
  encryptionKey?: string
  createdAt: Date
  expiresAt?: Date
  maxParticipants: number
  isActive: boolean
}

export interface CreateRoomOptions {
  name: string
  type: "public" | "private"
  expiresInHours?: number
  maxParticipants?: number
}

export class RoomManager {
  // Create a new chat room
  static async createRoom(options: CreateRoomOptions): Promise<ChatRoom | null> {
    try {
      const inviteCode = options.type === "public" ? "public" : this.generateInviteCode()
      const encryptionKey = options.type === "private" ? await this.generateEncryptionKey() : undefined
      const expiresAt = options.expiresInHours
        ? new Date(Date.now() + options.expiresInHours * 60 * 60 * 1000)
        : undefined

      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: options.name,
          type: options.type,
          inviteCode,
          encryptionKey,
          expiresAt: expiresAt?.toISOString(),
          maxParticipants: options.maxParticipants || 50,
        }),
      })

      if (!response.ok) throw new Error("Failed to create room")

      const room = await response.json()
      return room
    } catch (error) {
      console.error("Error creating room:", error)
      return null
    }
  }

  // Get room by invite code
  static async getRoomByInviteCode(inviteCode: string): Promise<ChatRoom | null> {
    try {
      const response = await fetch(`/api/rooms/${inviteCode}`)
      if (!response.ok) return null

      const room = await response.json()
      return room
    } catch (error) {
      console.error("Error fetching room:", error)
      return null
    }
  }

  // Generate invite link
  static generateInviteLink(inviteCode: string): string {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : ""
    return inviteCode === "public" ? `${baseUrl}/` : `${baseUrl}/room/${inviteCode}`
  }

  // Parse invite link
  static parseInviteLink(url: string): string | null {
    try {
      const urlObj = new URL(url)
      const pathParts = urlObj.pathname.split("/").filter(Boolean)

      if (pathParts.length === 0) return "public"
      if (pathParts.length === 2 && pathParts[0] === "room") {
        return pathParts[1]
      }

      return null
    } catch {
      return null
    }
  }

  private static generateInviteCode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let result = ""
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  private static async generateEncryptionKey(): Promise<string> {
    const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"])

    const exported = await crypto.subtle.exportKey("raw", key)
    return Array.from(new Uint8Array(exported))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  }
}
