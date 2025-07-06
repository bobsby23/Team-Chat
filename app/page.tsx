"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { MessageCircle, Shield, Smartphone, Users, Link, Download, Zap, Moon, Sun, Plus, Lock } from "lucide-react"
import { ChatInterface } from "@/components/chat-interface"
import { CreateRoomDialog } from "@/components/create-room-dialog"

export default function HomePage() {
  const [isInstallable, setIsInstallable] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [currentView, setCurrentView] = useState<"landing" | "chat">("landing")
  const [username, setUsername] = useState("")
  const [isDark, setIsDark] = useState(true)
  const [showCreateRoom, setShowCreateRoom] = useState(false)
  const [roomCode, setRoomCode] = useState("public")

  useEffect(() => {
    document.documentElement.classList.add("dark")

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
    }

    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  const toggleTheme = () => {
    setIsDark(!isDark)
    document.documentElement.classList.toggle("dark")
  }

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === "accepted") {
        setIsInstallable(false)
      }
      setDeferredPrompt(null)
    }
  }

  const handleJoinChat = (targetRoomCode = "public") => {
    if (username.trim()) {
      setRoomCode(targetRoomCode)
      setCurrentView("chat")
    }
  }

  const generateShareLink = () => {
    const shareUrl = `${window.location.origin}/`
    if (navigator.share) {
      navigator.share({
        title: "Join Bobsby Public Chat",
        text: "Join our public chat room",
        url: shareUrl,
      })
    } else {
      navigator.clipboard.writeText(shareUrl)
      alert("Public chat link copied to clipboard!")
    }
  }

  const handleRoomCreated = (inviteCode: string) => {
    setShowCreateRoom(false)
    handleJoinChat(inviteCode)
  }

  if (currentView === "chat") {
    return <ChatInterface username={username} roomCode={roomCode} onBack={() => setCurrentView("landing")} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Header */}
      <header className="border-b border-gray-700 bg-gray-800/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-8 w-8 text-blue-400" />
              <h1 className="text-2xl font-bold text-white">Bobsby Chat</h1>
              <Badge variant="secondary" className="hidden sm:inline-flex bg-blue-900 text-blue-100">
                PWA
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={toggleTheme} className="text-gray-300 hover:text-white">
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              {isInstallable && (
                <Button
                  onClick={handleInstall}
                  size="sm"
                  className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Install App</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[calc(100vh-80px)]">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
              Public & Private Chat,{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                Your Choice
              </span>
            </h2>
            <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
              Join the public chat instantly, or create encrypted private rooms with unique invite links.
            </p>
          </div>

          {/* Quick Join Public Chat */}
          <div className="max-w-md mx-auto mb-8">
            <div className="flex space-x-2">
              <Input
                placeholder="Enter your name"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleJoinChat()}
                className="flex-1 bg-gray-800 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
              />
              <Button
                onClick={() => handleJoinChat()}
                disabled={!username.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Zap className="h-4 w-4 mr-2" />
                Join Public
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button onClick={() => setShowCreateRoom(true)} size="lg" className="bg-purple-600 hover:bg-purple-700">
              <Plus className="h-5 w-5 mr-2" />
              Create Private Room
            </Button>
            <Button
              onClick={generateShareLink}
              variant="outline"
              size="lg"
              className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white bg-transparent"
            >
              <Link className="h-5 w-5 mr-2" />
              Share Public Chat
            </Button>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-gray-700 bg-gray-800/50 backdrop-blur-sm hover:bg-gray-800/70 transition-all">
              <CardHeader className="text-center">
                <Users className="h-10 w-10 text-blue-400 mx-auto mb-3" />
                <CardTitle className="text-white text-lg">Public Chat</CardTitle>
                <CardDescription className="text-gray-400 text-sm">
                  Open to everyone, no registration required
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-gray-700 bg-gray-800/50 backdrop-blur-sm hover:bg-gray-800/70 transition-all">
              <CardHeader className="text-center">
                <Lock className="h-10 w-10 text-purple-400 mx-auto mb-3" />
                <CardTitle className="text-white text-lg">Private Rooms</CardTitle>
                <CardDescription className="text-gray-400 text-sm">
                  End-to-end encrypted with unique invite links
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-gray-700 bg-gray-800/50 backdrop-blur-sm hover:bg-gray-800/70 transition-all">
              <CardHeader className="text-center">
                <Smartphone className="h-10 w-10 text-green-400 mx-auto mb-3" />
                <CardTitle className="text-white text-lg">Mobile PWA</CardTitle>
                <CardDescription className="text-gray-400 text-sm">
                  Install as an app for the best mobile experience
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-gray-700 bg-gray-800/50 backdrop-blur-sm hover:bg-gray-800/70 transition-all">
              <CardHeader className="text-center">
                <Shield className="h-10 w-10 text-orange-400 mx-auto mb-3" />
                <CardTitle className="text-white text-lg">Auto-Delete</CardTitle>
                <CardDescription className="text-gray-400 text-sm">
                  Messages auto-delete after 24 hours for privacy
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </main>

      {/* Create Room Dialog */}
      <CreateRoomDialog
        open={showCreateRoom}
        onOpenChange={setShowCreateRoom}
        onRoomCreated={handleRoomCreated}
        username={username}
        onUsernameChange={setUsername}
      />
    </div>
  )
}
