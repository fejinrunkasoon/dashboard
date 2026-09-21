import type { Member, Team } from '../../domain/organization'
import type { EntityStatus } from '../../domain/common'

export interface OrgTeamListItem extends Team {
  leaderName: string | null
  memberCount: number
}

export interface CreateTeamInput {
  code: string
  name: string
  leaderMemberId?: string | null
}

export interface UpdateTeamInput {
  name?: string
  leaderMemberId?: string | null
}

export interface CreateMemberInput {
  code: string
  name: string
  teamId: string
}

export interface UpdateMemberInput {
  name?: string
  teamId?: string
}

export interface OrganizationService {
  getTeams(keyword?: string): Promise<OrgTeamListItem[]>
  getTeamById(id: string): Promise<Team | null>
  getMembers(teamId?: string): Promise<Member[]>
  getMemberById(id: string): Promise<Member | null>
  createTeam(input: CreateTeamInput): Promise<Team>
  updateTeam(id: string, input: UpdateTeamInput): Promise<Team>
  setTeamStatus(id: string, status: EntityStatus): Promise<Team>
  createMember(input: CreateMemberInput): Promise<Member>
  updateMember(id: string, input: UpdateMemberInput): Promise<Member>
  setMemberStatus(id: string, status: EntityStatus): Promise<Member>
}
