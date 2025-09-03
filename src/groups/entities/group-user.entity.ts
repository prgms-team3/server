import { ApiProperty } from '@nestjs/swagger';
import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn,
	Unique,
	UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Group } from './group.entity';

export enum GroupRole {
	ADMIN = 'ADMIN',
	MEMBER = 'MEMBER',
}

@Entity('group_user')
@Unique(['groupId', 'userId'])
@Index(['groupId'])
@Index(['userId'])
@Index(['groupId', 'role'])
export class GroupUser {
	@ApiProperty({ description: '그룹 멤버 ID', example: 1 })
	@PrimaryGeneratedColumn()
	id: number;

	@ApiProperty({ description: '그룹 ID', example: 1 })
	@Column({ name: 'group_id' })
	groupId: number;

	@ApiProperty({ description: '사용자 ID', example: 1 })
	@Column({ name: 'user_id', type: 'int' })
	userId: number;

	@ApiProperty({
		description: '그룹 내 역할',
		enum: GroupRole,
		enumName: 'GroupRole',
		example: GroupRole.MEMBER,
		examples: {
			admin: {
				value: 'ADMIN',
				description: '관리자 - 그룹 설정 변경, 멤버 관리, 역할 변경 권한',
			},
			member: {
				value: 'MEMBER',
				description: '일반 멤버 - 그룹 참여 및 기본 활동 권한',
			},
		},
	})
	@Column({
		type: 'enum',
		enum: GroupRole,
		default: GroupRole.MEMBER,
	})
	role: GroupRole;

	@ApiProperty({ description: '가입일시' })
	@CreateDateColumn({ name: 'joined_at' })
	joinedAt: Date;

	@ApiProperty({ description: '수정일시', example: '2025-01-01T00:00:00.000Z' })
	@UpdateDateColumn({ name: 'updated_at' })
	updatedAt: Date;

	// Relations
	@ApiProperty({ description: '그룹 정보', type: () => Group })
	@ManyToOne(() => Group, (group) => group.members)
	@JoinColumn({ name: 'group_id' })
	group: Group;

	@ApiProperty({ description: '사용자 정보', type: () => User })
	@ManyToOne(() => User, { eager: true })
	@JoinColumn({ name: 'user_id' })
	user: User;
}
