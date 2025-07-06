"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Lock, Users, Copy, Check, AlertCircle, Clock } from "lucide-react"
import { RoomManager } from "@/lib/room-manager"

interface CreateRoomDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onRoomCreated: (inviteCode: string) => void
  username: string
  onUsernameChange: (username: string) => void
}

export function CreateRoomDialog({
  open,
  onOpenChange,
  onRoomCreated,
  username,
  onUsernameChange,
}: CreateRoomDialogProps) {
  const [step, setStep] = useState<"create" | "created">("create")
  const [roomName, setRoomName] = useState("")
  const [roomType, setRoomType] = useState<"public" | "private">("private")
  const [expiresInHours, setExpiresInHours] = useState(24)
  const [maxParticipants, setMaxParticipants] = useState(10)
  const [creating, setCreating] = useState(false)
  const [createdRoom, setCreatedRoom] = useState<any>(null)
  const [copied, setCopied] = useState(false)

  const handleCreateRoom = async () => {
    if (!roomName.trim() || !username.trim()) return

    setCreating(true)
    try {
      const room = await RoomManager.createRoom({
        name: roomName.trim(),
        type: roomType,
        expiresInHours: roomType === "private" ? expiresInHours : undefined,
        maxParticipants,
      })

      if (room) {
        setCreatedRoom(room)
        setStep("created")
      } else {
        alert("Failed to create room. Please try again.")
      }
    } catch (error) {
      console.error("Error creating room:", error)
      alert("Failed to create room. Please try again.")
    } finally {
      setCreating(false)
    }
  }

  const handleCopyLink = async () => {
    if (!createdRoom) return

    const inviteLink = RoomManager.generateInviteLink(createdRoom.invite_code)
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleJoinRoom = () => {
    if (createdRoom) {
      onRoomCreated(createdRoom.invite_code)
      handleClose()
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    setTimeout(() => {
      setStep("create")
      setRoomName("")
      setRoomType("private")
      setExpiresInHours(24)
      setMaxParticipants(10)
      setCreatedRoom(null)
      setCopied(false)
    }, 300)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-gray-800 border-gray-700 text-white">
        {step === "create" ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Lock className="h-5 w-5 mr-2 text-purple-400" />
                Create Private Room
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Create an encrypted chat room with a unique invite link
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="username" className="text-gray-300">
                  Your Name
                </Label>
                <Input
                  id="username"
                  placeholder="Enter your name"
                  value={username}
                  onChange={(e) => onUsernameChange(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
              </div>

              <div>
                <Label htmlFor="roomName" className="text-gray-300">
                  Room Name
                </Label>
                <Input
                  id="roomName"
                  placeholder="e.g., Team Meeting, Study Group"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="expires" className="text-gray-300">
                    Expires In (hours)
                  </Label>
                  <Input
                    id="expires"
                    type="number"
                    min="1"
                    max="168"
                    value={expiresInHours}
                    onChange={(e) => setExpiresInHours(Number.parseInt(e.target.value) || 24)}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="maxUsers" className="text-gray-300">
                    Max Users
                  </Label>
                  <Input
                    id="maxUsers"
                    type="number"
                    min="2"
                    max="100"
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(Number.parseInt(e.target.value) || 10)}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </div>

              <Card className="border-purple-700 bg-purple-900/20">
                <CardContent className="pt-4">
                  <div className="flex items-start space-x-3">
                    <Lock className="h-5 w-5 text-purple-400 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-purple-300 mb-1">End-to-End Encryption</p>
                      <ul className="text-purple-400 space-y-1">
                        <li>• Messages encrypted in your browser</li>
                        <li>• Only room members can decrypt messages</li>
                        <li>• Unique encryption key per room</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex space-x-2 pt-4">
                <Button
                  onClick={handleCreateRoom}
                  disabled={!roomName.trim() || !username.trim() || creating}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  {creating ? "Creating..." : "Create Room"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center text-green-400">
                <Check className="h-5 w-5 mr-2" />
                Room Created Successfully!
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Your private room is ready. Share the invite link with others.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Card className="bg-gray-700 border-gray-600">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-white">{createdRoom?.name}</CardTitle>
                  <div className="flex items-center space-x-2">
                    <Badge className="bg-purple-900 text-purple-100">
                      <Lock className="h-3 w-3 mr-1" />
                      Private
                    </Badge>
                    <Badge variant="outline" className="border-gray-500 text-gray-300">
                      <Users className="h-3 w-3 mr-1" />
                      Max {createdRoom?.max_participants}
                    </Badge>
                    <Badge variant="outline" className="border-gray-500 text-gray-300">
                      <Clock className="h-3 w-3 mr-1" />
                      {expiresInHours}h
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-gray-300 text-sm">Invite Code</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <code className="flex-1 bg-gray-800 px-3 py-2 rounded border border-gray-600 text-white font-mono">
                          {createdRoom?.invite_code}
                        </code>
                      </div>
                    </div>
                    <div>
                      <Label className="text-gray-300 text-sm">Invite Link</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        <Input
                          readOnly
                          value={createdRoom ? RoomManager.generateInviteLink(createdRoom.invite_code) : ""}
                          className="flex-1 bg-gray-800 border-gray-600 text-white font-mono text-sm"
                        />
                        <Button onClick={handleCopyLink} size="sm" className="bg-blue-600 hover:bg-blue-700">
                          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-orange-700 bg-orange-900/20">
                <CardContent className="pt-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="h-5 w-5 text-orange-400 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-orange-300 mb-1">Important</p>
                      <ul className="text-orange-400 space-y-1">
                        <li>• Save the invite link - you can't retrieve it later</li>
                        <li>• Room expires in {expiresInHours} hours</li>
                        <li>• Only people with the link can join</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex space-x-2 pt-4">
                <Button onClick={handleJoinRoom} className="flex-1 bg-green-600 hover:bg-green-700">
                  Join Room Now
                </Button>
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent"
                >
                  Close
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
