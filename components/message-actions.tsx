'use client'

import { useChat } from '@ai-sdk/react'
import { Copy } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'

import { Button } from './ui/button'
import { ChatShare } from './chat-share'
import { RetryButton } from './retry-button'

interface MessageActionsProps {
  message: string
  messageId: string
  reload?: () => Promise<string | null | undefined>
  chatId: string
  enableShare?: boolean
  className?: string
}

export function MessageActions({
  message,
  messageId,
  reload,
  chatId,
  enableShare,
  className
}: MessageActionsProps) {
  const { status } = useChat({
    id: chatId
  })
  const isLoading = status === 'submitted' || status === 'streaming'

  async function handleCopy() {
    await navigator.clipboard.writeText(message)
    toast.success('Message copied to clipboard')
  }

  return (
    <div
      className={cn(
        'flex items-center gap-0.5 sm:gap-1 self-end transition-opacity duration-200',
        isLoading ? 'opacity-0' : 'opacity-100',
        className
      )}
    >
      {reload && <RetryButton reload={reload} messageId={messageId} />}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleCopy}
        className="rounded-full h-8 w-8 sm:h-9 sm:w-9"
      >
        <Copy size={14} className="sm:size-4" />
      </Button>
      {enableShare && chatId && <ChatShare chatId={chatId} />}
    </div>
  )
}
