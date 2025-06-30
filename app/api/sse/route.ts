import type { NextRequest } from "next/server"

// Global connection storage that persists across requests
const globalConnections = new Map<string, ReadableStreamDefaultController>()
let connectionCounter = 0

// Make sure we export the connections for other modules
export const connections = globalConnections

export async function GET(request: NextRequest) {
  const connectionId = `conn_${++connectionCounter}_${Date.now()}`
  console.log(`🔌 New SSE connection: ${connectionId}`)

  const stream = new ReadableStream({
    start(controller) {
      // Store connection globally
      globalConnections.set(connectionId, controller)
      console.log(`📡 Total connections: ${globalConnections.size}`)

      // Send initial connection message
      try {
        const welcomeMessage = `data: ${JSON.stringify({
          type: "connected",
          connectionId,
          timestamp: Date.now(),
        })}\n\n`
        controller.enqueue(welcomeMessage)
        console.log(`✅ Welcome message sent to ${connectionId}`)
      } catch (error) {
        console.error(`❌ Error sending welcome to ${connectionId}:`, error)
        globalConnections.delete(connectionId)
        return
      }

      // Keep connection alive with heartbeat every 25 seconds
      const keepAlive = setInterval(() => {
        try {
          if (globalConnections.has(connectionId)) {
            const pingMessage = `data: ${JSON.stringify({
              type: "ping",
              timestamp: Date.now(),
              connectionId,
            })}\n\n`
            controller.enqueue(pingMessage)
            console.log(`💓 Heartbeat sent to ${connectionId}`)
          } else {
            console.log(`🔌 Connection ${connectionId} no longer exists, stopping heartbeat`)
            clearInterval(keepAlive)
          }
        } catch (error) {
          console.error(`💔 Heartbeat failed for ${connectionId}:`, error)
          clearInterval(keepAlive)
          globalConnections.delete(connectionId)
        }
      }, 25000)

      // Cleanup function
      const cleanup = () => {
        console.log(`🧹 Cleaning up connection: ${connectionId}`)
        clearInterval(keepAlive)
        globalConnections.delete(connectionId)
        console.log(`📡 Remaining connections: ${globalConnections.size}`)

        try {
          controller.close()
        } catch (error) {
          console.log(`🔌 Connection ${connectionId} already closed`)
        }
      }

      // Handle various cleanup scenarios
      if (request.signal) {
        request.signal.addEventListener("abort", cleanup)
      }
      // Store cleanup function for manual cleanup if needed
      ;(controller as any)._cleanup = cleanup
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
      "X-Accel-Buffering": "no",
    },
  })
}

// Enhanced broadcast function with better error handling
export function broadcastMessage(data: any) {
  const message = `data: ${JSON.stringify(data)}\n\n`
  const deadConnections: string[] = []
  let successCount = 0

  console.log(`📢 Broadcasting ${data.type} to ${globalConnections.size} connections`)

  globalConnections.forEach((controller, connectionId) => {
    try {
      controller.enqueue(message)
      successCount++
      console.log(`✅ Message sent to ${connectionId}`)
    } catch (error) {
      console.error(`❌ Failed to send to ${connectionId}:`, error)
      deadConnections.push(connectionId)
    }
  })

  // Clean up dead connections
  deadConnections.forEach((id) => {
    console.log(`🗑️ Removing dead connection: ${id}`)
    globalConnections.delete(id)
  })

  console.log(
    `📊 Broadcast complete: ${successCount} successful, ${deadConnections.length} failed, ${globalConnections.size} remaining`,
  )

  return {
    sent: successCount,
    failed: deadConnections.length,
    remaining: globalConnections.size,
  }
}
