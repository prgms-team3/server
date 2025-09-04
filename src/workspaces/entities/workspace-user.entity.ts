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
import { User } from '../../users/entities/user.entity';
import { Workspace } from './workspace.entity';

export enum WorkspaceRole {
	SUPER_ADMIN = 'SUPER_ADMIN',
	ADMIN = 'ADMIN',
	MEMBER = 'MEMBER',
}

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

	@ApiProperty({
		description: 'User role in workspace',
		example: WorkspaceRole.MEMBER,
		enum: WorkspaceRole,
	})
	@Column({
		type: 'enum',
		enum: WorkspaceRole,
		default: WorkspaceRole.MEMBER,
	})
	role: WorkspaceRole;

	@ApiProperty({ description: 'Join date', example: '2023-01-01T00:00:00.000Z' })
	@CreateDateColumn({ name: 'joined_at', type: 'datetime' })
	joinedAt: Date;

	@ApiProperty({ description: 'Update date', example: '2023-01-01T00:00:00.000Z' })
	@UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
	updatedAt: Date;

	/* Relations */
	@ApiProperty({ description: 'Workspace information', type: () => Workspace })
	@ManyToOne(() => Workspace, (workspace) => workspace.workspaceUsers)
	@JoinColumn({ name: 'workspace_id' })
	workspace: Workspace;

	@ApiProperty({ description: 'User information', type: () => User })
	@ManyToOne(() => User)
	@JoinColumn({ name: 'user_id' })
	user: User;
}
