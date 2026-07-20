export type ArrivalStatus = "bekliyor" | "geldi" | "gelmedi";
export type DecisionStatus = "bekliyor" | "onay" | "red";
export type UserRole = "admin" | "operator";

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  role: UserRole;
}

export interface ReturnRecord {
  id: string;
  customer_name: string;
  product_name: string;
  quantity: number;
  arrival_status: ArrivalStatus;
  decision_status: DecisionStatus;
  notes: string | null;
  created_by: string;
  received_by: string | null;
  checked_by: string | null;
  received_at: string | null;
  checked_at: string | null;
  created_at: string;
  updated_at: string;
  creator: Pick<Profile, "id" | "full_name" | "username"> | null;
  receiver: Pick<Profile, "id" | "full_name" | "username"> | null;
  checker: Pick<Profile, "id" | "full_name" | "username"> | null;
}

export interface ReturnLog {
  id: number;
  return_id: string;
  action: string;
  created_at: string;
  changer: Pick<Profile, "id" | "full_name" | "username"> | null;
}
