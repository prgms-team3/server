import { ApiProperty } from '@nestjs/swagger';
import {
	Column,
	CreateDateColumn,
	Entity,
	JoinColumn,
	ManyToOne,
	OneToMany,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from 'typeorm';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { GroupUser } from './group-user.entity';

@Entity('group')
export class Group {
	@ApiProperty({ description: 'Group ID', example: 1 })
	@PrimaryGeneratedColumn({ name: 'id', type: 'int' })
	id: number;

	@ApiProperty({ description: 'Workspace ID', example: 1 })
	@Column({ name: 'workspace_id', type: 'int' })
	workspaceId: number;

	@ApiProperty({ description: 'Group name', example: 'Development Team' })
	@Column({ nullable: false, type: 'varchar', length: 100 })
	name: string;

	@ApiProperty({ description: 'Group description', example: 'Software development team' })
	@Column({ nullable: true, type: 'text' })
	description: string;

	@ApiProperty({ description: 'Creation date', example: '2023-01-01T00:00:00.000Z' })
	@CreateDateColumn({ name: 'created_at', type: 'datetime' })
	createdAt: Date;

	@ApiProperty({ description: 'Update date', example: '2023-01-01T00:00:00.000Z' })
	@UpdateDateColumn({ name: 'updated_at', type: 'datetime' })
	updatedAt: Date;

	/* Relations */
	@ManyToOne(() => Workspace, (workspace) => workspace.groups)
	@JoinColumn({ name: 'workspace_id' })
	workspace: Workspace;

	@OneToMany(() => GroupUser, (groupUser) => groupUser.group)
	groupUsers: GroupUser[];
}
