/**
 * Shared database entity types for Hustl.
 *
 * These hand-written interfaces mirror the Postgres schema documented in
 * SETUP.md (tables: profiles, gigs, orders). Import them across pages and
 * server actions instead of redeclaring shapes, e.g.:
 *
 *   import type { Gig, OrderStatus } from "@/lib/types/database";
 *
 * If the schema later grows, regenerate with the Supabase CLI
 * (`supabase gen types typescript`) and reconcile against these.
 */

/** Lifecycle state of an order. Matches the CHECK constraint on orders.status. */
export type OrderStatus = "Pending" | "In Progress" | "Completed" | "Cancelled";

/**
 * A user profile. Row id matches auth.users.id (1:1 with Supabase Auth).
 * `is_seller` is set from the email domain (@usc.edu.ph) at signup by the
 * handle_new_user trigger; only sellers may post gigs.
 */
export interface Profile {
  id: string; // uuid, FK -> auth.users.id
  full_name: string | null;
  messenger_username: string | null; // used for m.me/<username> handoff
  bio: string | null;
  skills: string[] | null;
  is_seller: boolean;
  created_at: string; // timestamptz (ISO string)
  updated_at: string; // timestamptz (ISO string)
}

/**
 * A service listing posted by a student seller.
 * `image_url` references an object in the `gig-images` Storage bucket.
 */
export interface Gig {
  id: string; // uuid
  student_id: string; // uuid, FK -> profiles.id
  title: string;
  description: string | null;
  price: number; // numeric (PHP)
  category: string | null;
  image_url: string | null; // public URL / path into gig-images bucket
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}

/**
 * A transaction inquiry created when a client clicks "Inquire" on a gig.
 * Funds are handled off-platform (P2P); only the status is tracked here.
 */
export interface Order {
  id: string; // uuid
  gig_id: string; // uuid, FK -> gigs.id
  client_id: string; // uuid, FK -> profiles.id (the buyer)
  status: OrderStatus;
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
}
