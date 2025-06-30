"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { MessageCircle, Users, Shield } from "lucide-react"
import { ChatInterface } from "@/components/chat-interface"

export default function JoinChatPage() {
  const [username, setUsername] = useState("")
  const [hasJoined, setHasJoined] = useState(false)

  const handleJoinChat = () => {
    if (username.trim()) {
      setHasJoined(true)
    }
  }

  if (hasJoined) {
    return <ChatInterface username={username} onBack={() => setHasJoined(false)} />
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
            <Users className="h-16 w-16 text-blue-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Join the Chat</h2>
            <p className="text-gray-400">Enter your name to join the conversation</p>
          </div>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Almost there!</CardTitle>
              <CardDescription className="text-gray-400">Just tell us what to call you in the chat</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="username" className="text-gray-300">
                  Your Name
                </Label>
                <Input
                  id="username"
                  placeholder="Enter your name"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleJoinChat()}
                  className="mt-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                />
              </div>
              <Button
                onClick={handleJoinChat}
                disabled={!username.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Join Chat Room
              </Button>
            </CardContent>
          </Card>

          <Card className="mt-6 border-green-700 bg-green-900/20">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <Shield className="h-8 w-8 text-green-400" />
                <div>
                  <h3 className="font-semibold text-green-300">Privacy First</h3>
                  <p className="text-sm text-green-400">
                    No registration required. Messages auto-delete after 24 hours.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
