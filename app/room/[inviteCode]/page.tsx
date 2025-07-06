"use client"

import { useParams, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { ChatInterface } from "@/components/chat-interface"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MessageCircle, Users, Shield, Lock, AlertCircle } from "lucide-react"
import { RoomManager, type ChatRoom } from "@/lib/room-manager"

export default function RoomPage() {
  const params = useParams()
  const router = useRouter()
  const inviteCode = params.inviteCode as string

  const [currentUser, setCurrentUser] = useState("")
  const [isJoining, setIsJoining] = useState(true)
  const [room, setRoom] = useState<ChatRoom | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadRoom = async () => {
      try {
        const roomData = await RoomManager.getRoomByInviteCode(inviteCode)
        if (!roomData) {
          setError("Room not found or has expired")
        } else {
          setRoom(roomData)
        }
      } catch (err) {
        setError("Failed to load room")
      } finally {
        setLoading(false)
      }
    }

    if (inviteCode) {
      loadRoom()
    }
  }, [inviteCode])

  const handleJoinChat = () => {
    if (currentUser.trim() && room) {
      setIsJoining(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <MessageCircle className="h-16 w-16 text-blue-400 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-300">Loading room...</p>
        </div>
      </div>
    )
  }

  if (error || !room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <header className="border-b border-gray-700 bg-gray-800/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-8 w-8 text-blue-400" />
              <h1 className="text-2xl font-bold text-white">Bobsby Chat</h1>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <Card className="bg-gray-800 border-red-700">
              <CardHeader>
                <CardTitle className="text-red-400 flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  Room Not Found
                </CardTitle>
                <CardDescription className="text-gray-400">
                  {error || "This room doesn't exist or has expired."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => router.push("/")} className="w-full bg-blue-600 hover:bg-blue-700">
                  Go to Public Chat
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  if (!isJoining) {
    return <ChatInterface username={currentUser} roomCode={inviteCode} onBack={() => setIsJoining(true)} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <header className="border-b border-gray-700 bg-gray-800/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-2">
            <MessageCircle className="h-8 w-8 text-blue-400" />
            <h1 className="text-2xl font-bold text-white">Bobsby Chat</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            {room.type === "private" ? (
              <Lock className="h-16 w-16 text-purple-400 mx-auto mb-4" />
            ) : (
              <Users className="h-16 w-16 text-blue-400 mx-auto mb-4" />
            )}
            <h2 className="text-2xl font-bold text-white mb-2">Join {room.name}</h2>
            <p className="text-gray-400">
              {room.type === "private"
                ? "You've been invited to a private, encrypted chat room"
                : "Join this chat room"}
            </p>
          </div>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Enter Your Name</CardTitle>
              <CardDescription className="text-gray-400">
                Choose how you'd like to be identified in this chat
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="username" className="text-gray-300">
                  Your Name
                </Label>
                <Input
                  id="username"
                  placeholder="Enter your name"
                  value={currentUser}
                  onChange={(e) => setCurrentUser(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleJoinChat()}
                  className="mt-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                />
              </div>
              <Button
                onClick={handleJoinChat}
                disabled={!currentUser.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Join {room.name}
              </Button>
            </CardContent>
          </Card>

          <Card
            className={`mt-6 ${room.type === "private" ? "border-purple-700 bg-purple-900/20" : "border-green-700 bg-green-900/20"}`}
          >
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                {room.type === "private" ? (
                  <>
                    <Lock className="h-8 w-8 text-purple-400" />
                    <div>
                      <h3 className="font-semibold text-purple-300">End-to-End Encrypted</h3>
                      <p className="text-sm text-purple-400">Messages are encrypted and only visible to room members</p>
                    </div>
                  </>
                ) : (
                  <>
                    <Shield className="h-8 w-8 text-green-400" />
                    <div>
                      <h3 className="font-semibold text-green-300">Secure Connection</h3>
                      <p className="text-sm text-green-400">Messages auto-delete after 24 hours for privacy</p>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
