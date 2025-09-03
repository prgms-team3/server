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
@Index(['groupId', 'role']) // 역할별 조회 최적화
export class GroupUser {
	@ApiProperty({ description: '그룹 멤버 ID' })
	@PrimaryGeneratedColumn()
	id: number;

	@ApiProperty({ description: '그룹 ID' })
	@Column({ name: 'group_id' })
	groupId: number;

	@ApiProperty({ description: '사용자 ID' })
	@Column({ name: 'user_id' })
	userId: number;

	@ApiProperty({
		description: '그룹 역할',
		enum: GroupRole,
		example: GroupRole.MEMBER,
	})
	@Column({
		type: 'enum',
		enum: GroupRole,
		default: GroupRole.MEMBER,
	})
	role: GroupRole;

	@ApiProperty({ description: '가입일시' })
	@CreateDateColumn({ name: 'joined_at' })
	createdAt: Date;

	@ApiProperty({ description: '수정일시' })
	@UpdateDateColumn({ name: 'updated_at' })
	updatedAt: Date;

	// Relations
	@ApiProperty({ description: '그룹 정보', type: () => Group })
	@ManyToOne(
		() => Group,
		(group) => group.members,
		{
			onDelete: 'CASCADE',
		},
	)
	@JoinColumn({ name: 'group_id' })
	group: Group;

	@ApiProperty({ description: '사용자 정보', type: () => User })
	@ManyToOne(() => User, { eager: true })
	@JoinColumn({ name: 'user_id' })
	user: User;
}
