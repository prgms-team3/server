import { ApiProperty } from '@nestjs/swagger';
import {
	Column,
	CreateDateColumn,
	Entity,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn,
} from 'typeorm';
import { Group } from './group.entity';
import { User } from '../../users/entities/user.entity';

@Entity('group_user')
export class GroupUser {
	@ApiProperty({ description: 'Group User ID', example: 1 })
	@PrimaryGeneratedColumn({ name: 'id', type: 'int' })
	id: number;

	@ApiProperty({ description: 'Group ID', example: 1 })
	@Column({ name: 'group_id', type: 'int' })
	groupId: number;

	@ApiProperty({ description: 'User ID', example: 1 })
	@Column({ name: 'user_id', type: 'int' })
	userId: number;

	@ApiProperty({ description: 'Date added to group', example: '2023-01-01T00:00:00.000Z' })
	@CreateDateColumn({ name: 'added_at', type: 'datetime' })
	addedAt: Date;

	/* Relations */
	@ManyToOne(() => Group, (group) => group.groupUsers)
	@JoinColumn({ name: 'group_id' })
	group: Group;

	@ManyToOne(() => User)
	@JoinColumn({ name: 'user_id' })
	user: User;
}
