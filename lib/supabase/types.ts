export type OrgRole = 'org:admin' | 'org:member'

export interface Organization {
  id: string
  clerk_org_id: string
  stripe_customer_id: string | null
  name: string
  created_at: string
}

export interface User {
  id: string
  clerk_user_id: string
  org_id: string | null
  email: string
  role: OrgRole
  created_at: string
}

export interface Subscription {
  id: string
  org_id: string
  stripe_subscription_id: string
  plan: string
  status: string
  current_period_end: string
  created_at: string
}

export interface SubscriptionItem {
  id: string
  subscription_id: string
  stripe_item_id: string
  price_id: string
  created_at: string
}

export interface UsageRecord {
  id: string
  org_id: string
  subscription_item_id: string
  quantity: number
  timestamp: string
}

type DbRelationship = {
  foreignKeyName: string
  columns: string[]
  isOneToOne?: boolean
  referencedRelation: string
  referencedColumns: string[]
}

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: { id: string; clerk_org_id: string; stripe_customer_id: string | null; name: string; created_at: string }
        Insert: { clerk_org_id: string; stripe_customer_id?: string | null; name: string }
        Update: { clerk_org_id?: string; stripe_customer_id?: string | null; name?: string }
        Relationships: DbRelationship[]
      }
      users: {
        Row: { id: string; clerk_user_id: string; org_id: string | null; email: string; role: OrgRole; created_at: string }
        Insert: { clerk_user_id: string; org_id: string | null; email: string; role: OrgRole }
        Update: { clerk_user_id?: string; org_id?: string | null; email?: string; role?: OrgRole }
        Relationships: DbRelationship[]
      }
      subscriptions: {
        Row: { id: string; org_id: string; stripe_subscription_id: string; plan: string; status: string; current_period_end: string; created_at: string }
        Insert: { org_id: string; stripe_subscription_id: string; plan: string; status: string; current_period_end: string }
        Update: { org_id?: string; stripe_subscription_id?: string; plan?: string; status?: string; current_period_end?: string }
        Relationships: DbRelationship[]
      }
      subscription_items: {
        Row: { id: string; subscription_id: string; stripe_item_id: string; price_id: string; created_at: string }
        Insert: { subscription_id: string; stripe_item_id: string; price_id: string }
        Update: { subscription_id?: string; stripe_item_id?: string; price_id?: string }
        Relationships: DbRelationship[]
      }
      usage_records: {
        Row: { id: string; org_id: string; subscription_item_id: string; quantity: number; timestamp: string }
        Insert: { org_id: string; subscription_item_id: string; quantity: number; timestamp?: string }
        Update: { org_id?: string; subscription_item_id?: string; quantity?: number; timestamp?: string }
        Relationships: DbRelationship[]
      }
    }
    Views: Record<string, {
      Row: Record<string, unknown>
      Relationships: DbRelationship[]
    }>
    Functions: Record<string, {
      Args: Record<string, unknown>
      Returns: unknown
    }>
  }
}
