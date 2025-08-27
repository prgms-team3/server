import { ApiProperty } from '@nestjs/swagger';
import {
	Column,
	CreateDateColumn,
	Entity,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from 'typeorm';
import { Workspace } from './workspace.entity';
import { User } from '../../../../users/entities/user.entity';

@Entity('workspace_user')
export class WorkspaceUser {
	@ApiProperty({ description: 'Workspace User ID', example: 1 })
	@PrimaryGeneratedColumn({ name: 'id', type: 'int' })
	id: number;

	@ApiProperty({ description: 'Workspace ID', example: 1 })
	@Column({ name: 'workspace_id', type: 'int' })
	workspaceId: number;

	@ApiProperty({ description: 'User ID', example: 1 })
	@Column({ name: 'user_id', type: 'int' })
	userId: number;

	@ApiProperty({ description: 'Whether user is admin', example: false })
	@Column({ name: 'is_admin', type: 'boolean', default: false })
	isAdmin: boolean;

	@ApiProperty({ description: 'Join date', example: '2023-01-01T00:00:00.000Z' })
	@CreateDateColumn({ name: 'joined_at', type: 'datetime' })
	joinedAt: Date;

	@ApiProperty({ description: 'Update date', example: '2023-01-01T00:00:00.000Z' })
	@UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
	updatedAt: Date;

	/* Relations */
	@ManyToOne(() => Workspace, (workspace) => workspace.workspaceUsers)
	@JoinColumn({ name: 'workspace_id' })
	workspace: Workspace;

	@ManyToOne(() => User)
	@JoinColumn({ name: 'user_id' })
	user: User;
}
