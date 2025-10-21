'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { type Chat } from '@/lib/types'

export async function getChats(userId?: string | null) {
  if (!userId || userId === 'anonymous') {
    return []
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching chats:', error)
      return []
    }

    return (data || []).map(chat => ({
      ...chat,
      userId: chat.user_id,
      sharePath: chat.share_path,
      modelId: chat.model_id,
      modelName: chat.model_name,
      modelProvider: chat.model_provider,
      providerId: chat.provider_id,
      createdAt: new Date(chat.created_at)
    })) as Chat[]
  } catch (error) {
    console.error('Error fetching chats:', error)
    return []
  }
}

export async function getChatsPage(
  userId: string,
  limit = 20,
  offset = 0
): Promise<{ chats: Chat[]; nextOffset: number | null }> {
  if (userId === 'anonymous') {
    return { chats: [], nextOffset: null }
  }

  try {
    const supabase = await createClient()
    const { data, error, count } = await supabase
      .from('chats')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching chat page:', error)
      return { chats: [], nextOffset: null }
    }

    const chats = (data || []).map(chat => ({
      ...chat,
      userId: chat.user_id,
      sharePath: chat.share_path,
      modelId: chat.model_id,
      modelName: chat.model_name,
      modelProvider: chat.model_provider,
      providerId: chat.provider_id,
      createdAt: new Date(chat.created_at)
    })) as Chat[]

    const nextOffset = count && offset + limit < count ? offset + limit : null

    return { chats, nextOffset }
  } catch (error) {
    console.error('Error fetching chat page:', error)
    return { chats: [], nextOffset: null }
  }
}

export async function getChat(id: string, userId: string = 'anonymous') {
  try {
    const supabase = await createClient()

    // If anonymous, only allow viewing shared chats
    let query = supabase.from('chats').select('*').eq('id', id).single()

    const { data, error } = await query

    if (error || !data) {
      return null
    }

    // Check if user has access to this chat
    if (userId === 'anonymous' && !data.share_path) {
      return null
    }

    if (userId !== 'anonymous' && data.user_id !== userId && !data.share_path) {
      return null
    }

    return {
      ...data,
      userId: data.user_id,
      sharePath: data.share_path,
      modelId: data.model_id,
      modelName: data.model_name,
      modelProvider: data.model_provider,
      providerId: data.provider_id,
      createdAt: new Date(data.created_at)
    } as Chat
  } catch (error) {
    console.error('Error fetching chat:', error)
    return null
  }
}

export async function clearChats(
  userId: string = 'anonymous'
): Promise<{ error?: string }> {
  if (userId === 'anonymous') {
    return { error: 'Cannot clear chats for anonymous user' }
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase
      .from('chats')
      .delete()
      .eq('user_id', userId)

    if (error) {
      console.error('Error clearing chats:', error)
      return { error: 'Failed to clear chats' }
    }

    revalidatePath('/')
    redirect('/')
  } catch (error) {
    console.error('Error clearing chats:', error)
    return { error: 'Failed to clear chats' }
  }
}

export async function deleteChat(
  chatId: string,
  userId = 'anonymous'
): Promise<{ error?: string }> {
  if (userId === 'anonymous') {
    return { error: 'Cannot delete chats for anonymous user' }
  }

  try {
    const supabase = await createClient()

    // Verify ownership before deletion
    const { data: chat } = await supabase
      .from('chats')
      .select('user_id')
      .eq('id', chatId)
      .single()

    if (!chat) {
      return { error: 'Chat not found' }
    }

    if (chat.user_id !== userId) {
      return { error: 'Unauthorized' }
    }

    const { error } = await supabase
      .from('chats')
      .delete()
      .eq('id', chatId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting chat:', error)
      return { error: 'Failed to delete chat' }
    }

    revalidatePath('/')
    return {}
  } catch (error) {
    console.error(`Error deleting chat ${chatId}:`, error)
    return { error: 'Failed to delete chat' }
  }
}

export async function saveChat(chat: Chat, userId: string = 'anonymous') {
  if (userId === 'anonymous') {
    throw new Error('Cannot save chats for anonymous user')
  }

  try {
    const supabase = await createClient()

    const chatData = {
      id: chat.id,
      title: chat.title,
      user_id: userId,
      path: chat.path,
      messages: chat.messages,
      share_path: chat.sharePath || null,
      model_id: chat.modelId || null,
      model_name: chat.modelName || null,
      model_provider: chat.modelProvider || null,
      provider_id: chat.providerId || null,
      created_at: chat.createdAt?.toISOString() || new Date().toISOString()
    }

    // Upsert (insert or update)
    const { error } = await supabase.from('chats').upsert(chatData, {
      onConflict: 'id',
      ignoreDuplicates: false
    })

    if (error) {
      console.error('Error saving chat:', error)
      throw error
    }

    return { success: true }
  } catch (error) {
    console.error('Error saving chat:', error)
    throw error
  }
}

export async function getSharedChat(id: string) {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('id', id)
      .not('share_path', 'is', null)
      .single()

    if (error || !data) {
      return null
    }

    return {
      ...data,
      userId: data.user_id,
      sharePath: data.share_path,
      modelId: data.model_id,
      modelName: data.model_name,
      modelProvider: data.model_provider,
      providerId: data.provider_id,
      createdAt: new Date(data.created_at)
    } as Chat
  } catch (error) {
    console.error('Error fetching shared chat:', error)
    return null
  }
}

export async function shareChat(id: string, userId: string = 'anonymous') {
  if (userId === 'anonymous') {
    return null
  }

  try {
    const supabase = await createClient()

    // Verify ownership
    const { data: chat } = await supabase
      .from('chats')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (!chat) {
      return null
    }

    const sharePath = `/share/${id}`

    // Update with share_path
    const { data, error } = await supabase
      .from('chats')
      .update({ share_path: sharePath })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error || !data) {
      console.error('Error sharing chat:', error)
      return null
    }

    return {
      ...data,
      userId: data.user_id,
      sharePath: data.share_path,
      modelId: data.model_id,
      modelName: data.model_name,
      modelProvider: data.model_provider,
      providerId: data.provider_id,
      createdAt: new Date(data.created_at)
    } as Chat
  } catch (error) {
    console.error('Error sharing chat:', error)
    return null
  }
}
