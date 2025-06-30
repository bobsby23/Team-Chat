// XMPP Client Integration for Bobsby Chat
// This would integrate with Converse.js and Prosody server

export interface XMPPConfig {
  domain: string
  websocketUrl: string
  httpUploadUrl?: string
  allowGuestAccess: boolean
}

export interface ChatRoom {
  jid: string
  name: string
  description?: string
  isPublic: boolean
  memberCount: number
  roomCode?: string
}

export interface ChatMessage {
  id: string
  from: string
  to: string
  body: string
  timestamp: Date
  messageType: "chat" | "groupchat"
  encrypted: boolean
}

export class BobsbyChatClient {
  private config: XMPPConfig
  private connection: any // Converse.js connection
  private isConnected = false

  constructor(config: XMPPConfig) {
    this.config = config
  }

  async initialize() {
    // Initialize Converse.js
    if (typeof window !== "undefined") {
      const { converse } = await import("converse.js")

      converse.initialize({
        bosh_service_url: `https://${this.config.domain}/http-bind`,
        websocket_url: this.config.websocketUrl,
        domain: this.config.domain,

        // Authentication
        authentication: "login",
        auto_login: false,
        allow_guest_access: this.config.allowGuestAccess,

        // UI Configuration
        view_mode: "embedded",
        auto_focus: true,
        hide_muc_participants: false,

        // Security
        use_system_emojis: true,
        message_archiving: "always",

        // OMEMO Encryption
        omemo_default: true,
        trusted: true,

        // File Upload
        file_upload_url: this.config.httpUploadUrl,

        // Plugins
        whitelisted_plugins: ["converse-muc", "converse-omemo", "converse-httpupload", "converse-notification"],

        // Callbacks
        callback: this.onConnectionStatusChanged.bind(this),
      })
    }
  }

  private onConnectionStatusChanged(status: string) {
    switch (status) {
      case "connected":
        this.isConnected = true
        this.onConnected()
        break
      case "disconnected":
        this.isConnected = false
        this.onDisconnected()
        break
      case "error":
        this.onError()
        break
    }
  }

  async connectAsUser(username: string, password: string) {
    if (typeof window !== "undefined" && window.converse) {
      try {
        await window.converse.user.login(`${username}@${this.config.domain}`, password)
        return true
      } catch (error) {
        console.error("Login failed:", error)
        return false
      }
    }
    return false
  }

  async connectAsGuest(nickname: string, roomJid?: string) {
    if (typeof window !== "undefined" && window.converse) {
      try {
        // Generate temporary guest credentials
        const guestJid = `guest_${Date.now()}@${this.config.domain}`
        await window.converse.user.login(guestJid, "", {
          authentication: "anonymous",
        })

        if (roomJid) {
          await this.joinRoom(roomJid, nickname)
        }

        return true
      } catch (error) {
        console.error("Guest login failed:", error)
        return false
      }
    }
    return false
  }

  async createRoom(name: string, description?: string, isPublic = false): Promise<ChatRoom | null> {
    if (!this.isConnected) return null

    try {
      const roomJid = `${name.toLowerCase().replace(/\s+/g, "-")}@conference.${this.config.domain}`

      // Create room via Converse.js
      const room = await window.converse.rooms.create(roomJid, {
        name,
        description,
        public: isPublic,
        members_only: !isPublic,
        persistent: true,
        moderated: false,
      })

      return {
        jid: roomJid,
        name,
        description,
        isPublic,
        memberCount: 1,
        roomCode: this.generateRoomCode(),
      }
    } catch (error) {
      console.error("Failed to create room:", error)
      return null
    }
  }

  async joinRoom(roomJid: string, nickname: string): Promise<boolean> {
    if (!this.isConnected) return false

    try {
      await window.converse.rooms.open(roomJid, {
        nick: nickname,
      })
      return true
    } catch (error) {
      console.error("Failed to join room:", error)
      return false
    }
  }

  async sendMessage(to: string, message: string, isGroupChat = false): Promise<boolean> {
    if (!this.isConnected) return false

    try {
      if (isGroupChat) {
        const room = window.converse.chatboxes.get(to)
        if (room) {
          await room.sendMessage({ body: message })
          return true
        }
      } else {
        const chat = await window.converse.chats.open(to)
        await chat.sendMessage({ body: message })
        return true
      }
    } catch (error) {
      console.error("Failed to send message:", error)
    }
    return false
  }

  async enableOMEMO(roomJid?: string): Promise<boolean> {
    try {
      if (roomJid) {
        const room = window.converse.chatboxes.get(roomJid)
        if (room && room.omemo) {
          await room.omemo.enable()
          return true
        }
      } else {
        // Enable OMEMO globally
        if (window.converse.omemo) {
          await window.converse.omemo.enable()
          return true
        }
      }
    } catch (error) {
      console.error("Failed to enable OMEMO:", error)
    }
    return false
  }

  private generateRoomCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  private onConnected() {
    console.log("Connected to XMPP server")
    // Enable OMEMO by default
    this.enableOMEMO()
  }

  private onDisconnected() {
    console.log("Disconnected from XMPP server")
  }

  private onError() {
    console.error("XMPP connection error")
  }

  disconnect() {
    if (this.isConnected && window.converse) {
      window.converse.user.logout()
    }
  }
}

// Utility functions for room management
export function generateShareableLink(username: string, domain = "chat.bobsby.online"): string {
  return `https://${domain}/u/${username}`
}

export function generateRoomInviteLink(roomCode: string, domain = "chat.bobsby.online"): string {
  return `https://${domain}/r/${roomCode}`
}

export function parseInviteLink(url: string): { type: "user" | "room"; identifier: string } | null {
  try {
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split("/").filter(Boolean)

    if (pathParts.length === 2) {
      const [type, identifier] = pathParts
      if (type === "u" || type === "r") {
        return {
          type: type === "u" ? "user" : "room",
          identifier,
        }
      }
    }
  } catch (error) {
    console.error("Invalid invite link:", error)
  }
  return null
}
