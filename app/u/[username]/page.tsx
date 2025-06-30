"use client"

import { useParams } from "next/navigation"
import { useState } from "react"
import { ChatInterface } from "@/components/chat-interface"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MessageCircle, Users, Shield } from "lucide-react"

export default function UserChatPage() {
  const params = useParams()
  const targetUsername = params.username as string
  const [currentUser, setCurrentUser] = useState("")
  const [isJoining, setIsJoining] = useState(true)

  const handleJoinChat = () => {
    if (currentUser.trim()) {
      setIsJoining(false)
    }
  }

  if (!isJoining) {
    return <ChatInterface username={currentUser} onBack={() => setIsJoining(true)} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-2">
            <MessageCircle className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Bobsby Chat</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <Users className="h-16 w-16 text-blue-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Join {targetUsername}'s Chat</h2>
            <p className="text-gray-600">You've been invited to a secure chat room</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Join the Conversation</CardTitle>
              <CardDescription>Enter your name to start chatting securely</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="username">Your Name</Label>
                <Input
                  id="username"
                  placeholder="Enter your name"
                  value={currentUser}
                  onChange={(e) => setCurrentUser(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleJoinChat()}
                  className="mt-1"
                />
              </div>
              <Button onClick={handleJoinChat} disabled={!currentUser.trim()} className="w-full">
                Join Chat
              </Button>
            </CardContent>
          </Card>

          <Card className="mt-6 border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <Shield className="h-8 w-8 text-green-600" />
                <div>
                  <h3 className="font-semibold text-green-800">Secure Connection</h3>
                  <p className="text-sm text-green-700">All messages are encrypted end-to-end using OMEMO protocol</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
