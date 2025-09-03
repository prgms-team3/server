import { ApiProperty } from '@nestjs/swagger';
import {
	Column,
	CreateDateColumn,
	Entity,
	OneToMany,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from 'typeorm';
import { Group } from '../../groups/entities/group.entity';
import { Space } from '../../spaces/entities/space.entity';
import { InvitationHistory } from './invitation-history.entity';
import { WorkspaceInvitationCode } from './workspace-invitation-code.entity';
import { WorkspaceUser } from './workspace-user.entity';

@Entity('workspace')
export class Workspace {
	@ApiProperty({ description: 'Workspace ID', example: 1 })
	@PrimaryGeneratedColumn({ name: 'id', type: 'int' })
	id: number;

	@ApiProperty({ description: 'Workspace name', example: 'Tech Company' })
	@Column({ nullable: false, type: 'varchar', length: 100 })
	name: string;

	@ApiProperty({
		description: 'Workspace description',
		example: 'Our main office workspace',
		required: false,
	})
	@Column({ nullable: true, type: 'text' })
	description?: string;

	@ApiProperty({
		description: 'Creation date',
		example: '2023-01-01T00:00:00.000Z',
	})
	@CreateDateColumn({ name: 'created_at', type: 'datetime' })
	createdAt: Date;

	@ApiProperty({
		description: 'Update date',
		example: '2023-01-01T00:00:00.000Z',
	})
	@UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
	updatedAt: Date;

	@ApiProperty({ description: 'Whether workspace is active', example: true })
	@Column({ name: 'is_active', type: 'boolean', default: true })
	isActive: boolean;

	@ApiProperty({ description: 'Whether workspace is deleted', example: false })
	@Column({ name: 'deleted', type: 'boolean', default: false })
	deleted: boolean;

	/* Relations */
	@ApiProperty({
		description: '워크스페이스 사용자들',
		type: () => [WorkspaceUser],
	})
	@OneToMany(() => WorkspaceUser, (workspaceUser) => workspaceUser.workspace)
	workspaceUsers: WorkspaceUser[];

	@ApiProperty({ description: '워크스페이스 그룹들', type: () => [Group] })
	@OneToMany(() => Group, (group) => group.workspace)
	groups: Group[];

	@ApiProperty({
		description: '초대 코드들',
		type: () => [WorkspaceInvitationCode],
	})
	@OneToMany(() => WorkspaceInvitationCode, (invitationCode) => invitationCode.workspace)
	invitationCodes: WorkspaceInvitationCode[];

	@ApiProperty({
		description: '초대 히스토리',
		type: () => [InvitationHistory],
	})
	@OneToMany(() => InvitationHistory, (invitationHistory) => invitationHistory.workspace)
	invitationHistories: InvitationHistory[];

	@OneToMany(() => Space, (space) => space.workspace)
	spaces: Space[];
	// Virtual properties
	@ApiProperty({ description: '총 멤버 수' })
	get totalMembers(): number {
		return this.workspaceUsers?.length ?? 0;
	}

	@ApiProperty({ description: '활성 그룹 수' })
	get activeGroupsCount(): number {
		return this.groups?.filter((group) => group.isActive && !group.deletedAt).length ?? 0;
	}

	@ApiProperty({ description: '관리자 목록', type: () => [WorkspaceUser] })
	get admins(): WorkspaceUser[] {
		return this.workspaceUsers?.filter((wu) => wu.role === 'ADMIN') ?? [];
	}

	// Business logic methods
	isUserMember(userId: number): boolean {
		return this.workspaceUsers?.some((wu) => wu.userId === userId) ?? false;
	}

	isUserAdmin(userId: number): boolean {
		return (
			this.workspaceUsers?.some((wu) => wu.userId === userId && wu.role === 'ADMIN') ?? false
		);
	}
}
