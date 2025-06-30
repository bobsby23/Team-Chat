"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Users, Link, Shield, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface GuestAccessProps {
  onBack: () => void
  onJoinChat: (username: string) => void
}

export function GuestAccess({ onBack, onJoinChat }: GuestAccessProps) {
  const [guestName, setGuestName] = useState("")
  const [roomCode, setRoomCode] = useState("")
  const [joinMethod, setJoinMethod] = useState<"code" | "link">("code")

  const [showCreateAccount, setShowCreateAccount] = useState(false)
  const [accountForm, setAccountForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  })

  const handleJoinAsGuest = () => {
    if (guestName.trim()) {
      onJoinChat(`guest_${guestName}`)
    }
  }

  const handleJoinByLink = () => {
    // In a real app, this would parse the room from URL or clipboard
    if (guestName.trim()) {
      onJoinChat(`guest_${guestName}`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-semibold">Join as Guest</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto space-y-6">
          <div className="text-center">
            <Users className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Quick Access</h2>
            <p className="text-gray-600">Join a chat room without creating an account</p>
          </div>

          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Guest sessions are secure and encrypted, but messages are not stored permanently.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Guest Information</CardTitle>
              <CardDescription>Choose how you'd like to be identified in the chat</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="guestName">Display Name</Label>
                <Input
                  id="guestName"
                  placeholder="Enter your name"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="flex space-x-2">
              <Button
                variant={joinMethod === "code" ? "default" : "outline"}
                onClick={() => setJoinMethod("code")}
                className="flex-1"
              >
                Room Code
              </Button>
              <Button
                variant={joinMethod === "link" ? "default" : "outline"}
                onClick={() => setJoinMethod("link")}
                className="flex-1"
              >
                Invite Link
              </Button>
            </div>

            {joinMethod === "code" ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Join by Room Code
                  </CardTitle>
                  <CardDescription>Enter the room code shared with you</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="roomCode">Room Code</Label>
                    <Input
                      id="roomCode"
                      placeholder="e.g., ROOM123"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                      className="mt-1 font-mono"
                    />
                  </div>
                  <Button
                    onClick={handleJoinAsGuest}
                    disabled={!guestName.trim() || !roomCode.trim()}
                    className="w-full"
                  >
                    Join Room
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Link className="h-5 w-5 mr-2" />
                    Join by Invite Link
                  </CardTitle>
                  <CardDescription>Paste the invite link you received</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="inviteLink">Invite Link</Label>
                    <Input id="inviteLink" placeholder="https://chat.bobsby.online/r/..." className="mt-1" />
                  </div>
                  <Button onClick={handleJoinByLink} disabled={!guestName.trim()} className="w-full">
                    Join from Link
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="pt-6">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-orange-800 mb-1">Guest Session Limits</p>
                  <ul className="text-orange-700 space-y-1">
                    <li>• Session expires after 24 hours</li>
                    <li>• Messages not saved permanently</li>
                    <li>• Limited to text messages only</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-center">
            <p className="text-sm text-gray-500 mb-2">Want full features?</p>
            <Button variant="outline" size="sm" onClick={() => setShowCreateAccount(true)}>
              Create Account
            </Button>
          </div>
        </div>
      </div>

      {/* Create Account Modal */}
      {showCreateAccount && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Create Account</span>
                <Button variant="ghost" size="sm" onClick={() => setShowCreateAccount(false)}>
                  ×
                </Button>
              </CardTitle>
              <CardDescription>Upgrade from guest access to full account</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="newUsername">Username</Label>
                <Input
                  id="newUsername"
                  placeholder="Choose a username"
                  value={accountForm.username}
                  onChange={(e) => setAccountForm((prev) => ({ ...prev, username: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={accountForm.email}
                  onChange={(e) => setAccountForm((prev) => ({ ...prev, email: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Create a strong password"
                  value={accountForm.password}
                  onChange={(e) => setAccountForm((prev) => ({ ...prev, password: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={accountForm.confirmPassword}
                  onChange={(e) => setAccountForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div className="flex space-x-2 pt-4">
                <Button
                  onClick={() => {
                    if (
                      accountForm.username &&
                      accountForm.email &&
                      accountForm.password &&
                      accountForm.password === accountForm.confirmPassword
                    ) {
                      alert(`Account created for ${accountForm.username}! You can now access all features.`)
                      setShowCreateAccount(false)
                      setAccountForm({ username: "", email: "", password: "", confirmPassword: "" })
                    } else {
                      alert("Please fill all fields and ensure passwords match.")
                    }
                  }}
                  className="flex-1"
                >
                  Create Account
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateAccount(false)
                    setAccountForm({ username: "", email: "", password: "", confirmPassword: "" })
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
