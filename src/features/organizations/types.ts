export type OrganizationAccessLevel = 1 | 2 | 3

export interface OrganizationAccessRecord {
  id: string
  accessLevel: OrganizationAccessLevel
  programId?: string
  facultyId?: string
}

