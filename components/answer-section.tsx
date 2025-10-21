'use client'

import { ChatRequestOptions } from 'ai'

import { CollapsibleMessage } from './collapsible-message'
import { DefaultSkeleton } from './default-skeleton'
import { FHIRAttachments } from './fhir-attachments'
import { BotMessage } from './message'
import { MessageActions } from './message-actions'

export type AnswerSectionProps = {
  content: string
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  chatId?: string
  showActions?: boolean
  messageId: string
  data?: any[] // Data annotations from streaming
  reload?: (
    messageId: string,
    options?: ChatRequestOptions
  ) => Promise<string | null | undefined>
}

export function AnswerSection({
  content,
  isOpen,
  onOpenChange,
  chatId,
  showActions = true, // Default to true for backward compatibility
  messageId,
  data,
  reload
}: AnswerSectionProps) {
  const enableShare = process.env.NEXT_PUBLIC_ENABLE_SHARE === 'true'

  const handleReload = () => {
    if (reload) {
      return reload(messageId)
    }
    return Promise.resolve(undefined)
  }

  // Extract FHIR metadata from data annotations
  const fhirMetadata = data?.find(
    (item: any) => item && item.type === 'fhir-metadata'
  )

  const message = content ? (
    <div className="flex flex-col gap-1">
      <BotMessage message={content} />
      {fhirMetadata && <FHIRAttachments metadata={fhirMetadata} />}
      {showActions && (
        <MessageActions
          message={content} // Keep original message content for copy
          messageId={messageId}
          chatId={chatId || ''}
          enableShare={enableShare}
          reload={handleReload}
        />
      )}
    </div>
  ) : (
    <DefaultSkeleton />
  )
  return (
    <CollapsibleMessage
      role="assistant"
      isCollapsible={false}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      showBorder={false}
      showIcon={false}
    >
      {message}
    </CollapsibleMessage>
  )
}
