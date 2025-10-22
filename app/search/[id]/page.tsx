import { notFound, redirect } from 'next/navigation'

import { getChat } from '@/lib/actions/chat'
import { getCurrentUserId } from '@/lib/auth/get-current-user'
import { getModels } from '@/lib/config/models'
import { ExtendedCoreMessage, SearchResults } from '@/lib/types' // Added SearchResults
import { convertToUIMessages } from '@/lib/utils'

import { Chat } from '@/components/chat'

export const maxDuration = 60

export async function generateMetadata(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params
  const userId = await getCurrentUserId()
  const chat = await getChat(id, userId || 'anonymous') // Ensure fallback for userId

  let metadata: {
    title: string
    openGraph?: { images?: { url: string; width?: number; height?: number }[] }
  } = {
    title: chat?.title?.toString().slice(0, 50) || 'Search'
  }

  if (chat && chat.messages) {
    const dataMessage = chat.messages.find(
      (msg: ExtendedCoreMessage) => msg.role === 'data'
    )

    if (dataMessage && dataMessage.content) {
      // Assuming dataMessage.content is of type SearchResults or a compatible structure
      const searchData = dataMessage.content as SearchResults
      if (searchData.images && searchData.images.length > 0) {
        const firstImage = searchData.images[0]
        let imageUrl: string | undefined = undefined

        if (typeof firstImage === 'string') {
          imageUrl = firstImage
        } else if (typeof firstImage === 'object' && firstImage.url) {
          imageUrl = firstImage.url
        }

        if (imageUrl) {
          metadata.openGraph = {
            images: [{ url: imageUrl, width: 1200, height: 630 }] // Standard OG image dimensions
          }
        }
      }
    }
  }
  // If no image is found, metadata.openGraph.images will remain undefined,
  // allowing fallback to parent or global OG image settings.
  return metadata
}

// ... rest of the file (default export SearchPage) remains the same
export default async function SearchPage(props: {
  params: Promise<{ id: string }>
}) {
  const userId = await getCurrentUserId()
  const { id } = await props.params

  const chat = await getChat(id, userId)

  // Log the raw messages from database
  console.log('🔍 [SearchPage] Loading chat:', id)
  console.log(
    '🔍 [SearchPage] Raw messages from DB:',
    chat?.messages?.length || 0
  )
  if (chat?.messages) {
    chat.messages.forEach((msg: any, idx: number) => {
      console.log(`🔍 [SearchPage] Message ${idx}:`, {
        role: msg.role,
        contentType: typeof msg.content,
        hasType:
          msg.content && typeof msg.content === 'object'
            ? msg.content.type
            : 'N/A'
      })
    })
  }

  // convertToUIMessages for useChat hook
  const messages = convertToUIMessages(chat?.messages || [])

  console.log('🔍 [SearchPage] Converted UI messages:', messages.length)
  messages.forEach((msg: any, idx: number) => {
    console.log(`🔍 [SearchPage] UI Message ${idx}:`, {
      role: msg.role,
      hasAnnotations: !!msg.annotations,
      annotationCount: msg.annotations?.length || 0,
      annotationTypes: msg.annotations?.map((a: any) => a.type) || []
    })
  })

  if (!chat) {
    redirect('/')
  }

  if (chat?.userId !== userId && chat?.userId !== 'anonymous') {
    notFound()
  }

  const models = await getModels()
  return <Chat key={id} id={id} savedMessages={messages} models={models} />
}
