export interface UserInfo {
  /** Primary key (bigint in DB) */
  id: number

  /** username/login handle */
  user_name: string

  /** optional first name */
  first_name?: string | null

  /** optional last name */
  last_name?: string | null

  /** optional email */
  email?: string | null

  /** password (usually hashed). Avoid sending raw passwords to the client in production */
  password?: string | null
}

export type User = UserInfo
