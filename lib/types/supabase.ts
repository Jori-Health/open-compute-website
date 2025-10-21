import { ExtendedCoreMessage } from './index'

export type Database = {
  public: {
    Tables: {
      chats: {
        Row: {
          id: string
          title: string
          user_id: string
          path: string
          messages: ExtendedCoreMessage[]
          share_path: string | null
          model_id: string | null
          model_name: string | null
          model_provider: string | null
          provider_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          title: string
          user_id: string
          path: string
          messages?: ExtendedCoreMessage[]
          share_path?: string | null
          model_id?: string | null
          model_name?: string | null
          model_provider?: string | null
          provider_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          user_id?: string
          path?: string
          messages?: ExtendedCoreMessage[]
          share_path?: string | null
          model_id?: string | null
          model_name?: string | null
          model_provider?: string | null
          provider_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

// Type helper for chat operations
export type DbChat = Database['public']['Tables']['chats']['Row']
export type DbChatInsert = Database['public']['Tables']['chats']['Insert']
export type DbChatUpdate = Database['public']['Tables']['chats']['Update']
