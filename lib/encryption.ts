// End-to-end encryption utilities for private chat rooms
export class ChatEncryption {
  private static encoder = new TextEncoder()
  private static decoder = new TextDecoder()

  // Generate a new encryption key for a private room
  static async generateRoomKey(): Promise<string> {
    const key = await crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 256,
      },
      true,
      ["encrypt", "decrypt"],
    )

    const exported = await crypto.subtle.exportKey("raw", key)
    return Array.from(new Uint8Array(exported))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  }

  // Import key from hex string
  private static async importKey(keyHex: string): Promise<CryptoKey> {
    const keyBytes = new Uint8Array(keyHex.match(/.{2}/g)!.map((byte) => Number.parseInt(byte, 16)))

    return await crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["encrypt", "decrypt"])
  }

  // Encrypt message content
  static async encryptMessage(content: string, keyHex: string): Promise<string> {
    try {
      const key = await this.importKey(keyHex)
      const iv = crypto.getRandomValues(new Uint8Array(12))
      const data = this.encoder.encode(content)

      const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data)

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength)
      combined.set(iv)
      combined.set(new Uint8Array(encrypted), iv.length)

      return Array.from(combined)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
    } catch (error) {
      console.error("Encryption failed:", error)
      return content // Fallback to unencrypted
    }
  }

  // Decrypt message content
  static async decryptMessage(encryptedHex: string, keyHex: string): Promise<string> {
    try {
      const key = await this.importKey(keyHex)
      const combined = new Uint8Array(encryptedHex.match(/.{2}/g)!.map((byte) => Number.parseInt(byte, 16)))

      const iv = combined.slice(0, 12)
      const encrypted = combined.slice(12)

      const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, encrypted)

      return this.decoder.decode(decrypted)
    } catch (error) {
      console.error("Decryption failed:", error)
      return "[Encrypted Message]" // Fallback for failed decryption
    }
  }

  // Generate a secure invite code
  static generateInviteCode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let result = ""
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }
}
