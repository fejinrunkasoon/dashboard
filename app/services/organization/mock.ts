import { members, teams } from '../../mocks'
import type { Member, Team } from '../../domain/organization'
import type { EntityStatus } from '../../domain/common'
import type {
  CreateMemberInput,
  CreateTeamInput,
  OrganizationService,
  OrgTeamListItem,
  UpdateMemberInput,
  UpdateTeamInput
} from './types'

function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '_')
}

function assertStatus(status: EntityStatus) {
  if (status !== 'ACTIVE' && status !== 'DISABLED' && status !== 'ARCHIVED') {
    throw new Error(`Invalid status: ${status}`)
  }
}

function toTeamListItem(team: Team): OrgTeamListItem {
  const leader = team.leaderMemberId
    ? members.find(item => item.id === team.leaderMemberId)
    : null
  return {
    ...team,
    leaderName: leader?.name ?? null,
    memberCount: members.filter(item => item.teamId === team.id).length
  }
}

export const organizationService: OrganizationService = {
  async getTeams(keyword) {
    let rows = [...teams]
    if (keyword?.trim()) {
      const q = keyword.trim().toLowerCase()
      rows = rows.filter((team) => {
        const leader = team.leaderMemberId
          ? members.find(item => item.id === team.leaderMemberId)
          : null
        return (
          team.name.toLowerCase().includes(q)
          || team.code.toLowerCase().includes(q)
          || (leader?.name.toLowerCase().includes(q) ?? false)
        )
      })
    }
    return rows.map(toTeamListItem)
  },

  async getTeamById(id) {
    return teams.find(item => item.id === id) ?? null
  },

  async getMembers(teamId) {
    if (!teamId) return [...members]
    return members.filter(item => item.teamId === teamId)
  },

  async getMemberById(id) {
    return members.find(item => item.id === id) ?? null
  },

  async createTeam(input: CreateTeamInput): Promise<Team> {
    const code = normalizeCode(input.code)
    const name = input.name?.trim()
    if (!code) throw new Error('code is required')
    if (!name) throw new Error('name is required')
    if (teams.some(item => item.code === code)) {
      throw new Error(`Team code already exists: ${code}`)
    }

    if (input.leaderMemberId) {
      const leader = members.find(item => item.id === input.leaderMemberId)
      if (!leader) throw new Error(`Unknown member: ${input.leaderMemberId}`)
    }

    const team: Team = {
      id: `team-${code.toLowerCase().replace(/_/g, '-')}`,
      code,
      name,
      leaderMemberId: input.leaderMemberId ?? null,
      status: 'ACTIVE'
    }

    if (teams.some(item => item.id === team.id)) {
      team.id = `team-${code.toLowerCase()}-${teams.length + 1}`
    }

    teams.push(team)

    if (team.leaderMemberId) {
      const leader = members.find(item => item.id === team.leaderMemberId)
      if (leader && leader.teamId !== team.id) {
        leader.teamId = team.id
      }
    }

    return { ...team }
  },

  async updateTeam(id: string, input: UpdateTeamInput): Promise<Team> {
    const team = teams.find(item => item.id === id)
    if (!team) throw new Error(`Unknown team: ${id}`)

    if (input.name !== undefined) {
      const name = input.name.trim()
      if (!name) throw new Error('name is required')
      team.name = name
    }
    if (input.leaderMemberId !== undefined) {
      if (input.leaderMemberId) {
        const leader = members.find(item => item.id === input.leaderMemberId)
        if (!leader) throw new Error(`Unknown member: ${input.leaderMemberId}`)
        if (leader.teamId !== team.id) {
          leader.teamId = team.id
        }
      }
      team.leaderMemberId = input.leaderMemberId
    }

    return { ...team }
  },

  async setTeamStatus(id: string, status: EntityStatus): Promise<Team> {
    assertStatus(status)
    const team = teams.find(item => item.id === id)
    if (!team) throw new Error(`Unknown team: ${id}`)
    team.status = status
    return { ...team }
  },

  async createMember(input: CreateMemberInput): Promise<Member> {
    const code = normalizeCode(input.code)
    const name = input.name?.trim()
    if (!code) throw new Error('code is required')
    if (!name) throw new Error('name is required')
    if (!input.teamId) throw new Error('teamId is required')
    if (members.some(item => item.code === code)) {
      throw new Error(`Member code already exists: ${code}`)
    }

    const team = teams.find(item => item.id === input.teamId)
    if (!team) throw new Error(`Unknown team: ${input.teamId}`)

    const member: Member = {
      id: `mem-${code.toLowerCase().replace(/_/g, '-')}`,
      code,
      name,
      teamId: input.teamId,
      status: 'ACTIVE'
    }

    if (members.some(item => item.id === member.id)) {
      member.id = `mem-${code.toLowerCase()}-${members.length + 1}`
    }

    members.push(member)
    return { ...member }
  },

  async updateMember(id: string, input: UpdateMemberInput): Promise<Member> {
    const member = members.find(item => item.id === id)
    if (!member) throw new Error(`Unknown member: ${id}`)

    if (input.name !== undefined) {
      const name = input.name.trim()
      if (!name) throw new Error('name is required')
      member.name = name
    }
    if (input.teamId !== undefined) {
      const team = teams.find(item => item.id === input.teamId)
      if (!team) throw new Error(`Unknown team: ${input.teamId}`)
      const previousTeamId = member.teamId
      member.teamId = input.teamId

      // Clear leader if moved out of previous team
      const previousTeam = teams.find(item => item.id === previousTeamId)
      if (previousTeam?.leaderMemberId === member.id && previousTeamId !== input.teamId) {
        previousTeam.leaderMemberId = null
      }
    }

    return { ...member }
  },

  async setMemberStatus(id: string, status: EntityStatus): Promise<Member> {
    assertStatus(status)
    const member = members.find(item => item.id === id)
    if (!member) throw new Error(`Unknown member: ${id}`)
    member.status = status

    if (status !== 'ACTIVE') {
      const team = teams.find(item => item.leaderMemberId === member.id)
      if (team) team.leaderMemberId = null
    }

    return { ...member }
  }
}
