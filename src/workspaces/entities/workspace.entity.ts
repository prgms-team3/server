import { ApiProperty } from '@nestjs/swagger';
import {
	Column,
	CreateDateColumn,
	Entity,
	OneToMany,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from 'typeorm';
import { WorkspaceUser } from './workspace-user.entity';
import { Group } from '../../groups/entities/group.entity';
import { WorkspaceInvitationCode } from './workspace-invitation-code.entity';
import { InvitationHistory } from './invitation-history.entity';
import { Space } from '../../spaces/entities/space.entity';

@Entity('workspace')
export class Workspace {
	@ApiProperty({ description: 'Workspace ID', example: 1 })
	@PrimaryGeneratedColumn({ name: 'id', type: 'int' })
	id: number;

	@ApiProperty({ description: 'Workspace name', example: 'Tech Company' })
	@Column({ nullable: false, type: 'varchar', length: 100 })
	name: string;

	@ApiProperty({ description: 'Workspace description', example: 'Our main office workspace' })
	@Column({ nullable: true, type: 'text' })
	description: string;

	@ApiProperty({ description: 'Creation date', example: '2023-01-01T00:00:00.000Z' })
	@CreateDateColumn({ name: 'created_at', type: 'datetime' })
	createdAt: Date;

	@ApiProperty({ description: 'Update date', example: '2023-01-01T00:00:00.000Z' })
	@UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
	updatedAt: Date;

	@ApiProperty({ description: 'Whether workspace is active', example: true })
	@Column({ name: 'is_active', type: 'boolean', default: true })
	isActive: boolean;

	@ApiProperty({ description: 'Whether workspace is deleted', example: false })
	@Column({ name: 'deleted', type: 'boolean', default: false })
	deleted: boolean;

	/* Relations */
	@OneToMany(() => WorkspaceUser, (workspaceUser) => workspaceUser.workspace)
	workspaceUsers: WorkspaceUser[];

	@OneToMany(() => Group, (group) => group.workspace)
	groups: Group[];

	@OneToMany(() => WorkspaceInvitationCode, (invitationCode) => invitationCode.workspace)
	invitationCodes: WorkspaceInvitationCode[];

	@OneToMany(() => InvitationHistory, (invitationHistory) => invitationHistory.workspace)
	invitationHistories: InvitationHistory[];

	@OneToMany(() => Space, (space) => space.workspace)
	spaces: Space[];
}
