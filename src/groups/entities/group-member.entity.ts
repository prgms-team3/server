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
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Group } from './group.entity';

export enum GroupRole {
	ADMIN = 'ADMIN',
	MEMBER = 'MEMBER',
}

@Entity('group_members')
@Unique(['groupId', 'userId'])
@Index(['groupId'])
@Index(['userId'])
export class GroupMember {
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
	joinedAt: Date;

	// Relations
	@ApiProperty({ description: '그룹 정보', type: () => Group })
	@ManyToOne(() => Group, (group) => group.members, {
		onDelete: 'CASCADE',
	})
	@JoinColumn({ name: 'group_id' })
	group: Group;

	@ApiProperty({ description: '사용자 정보', type: () => User })
	@ManyToOne(() => User, { eager: true })
	@JoinColumn({ name: 'user_id' })
	user: User;

	// 비즈니스 로직 메서드
	isAdmin(): boolean {
		return this.role === GroupRole.ADMIN;
	}

	isMember(): boolean {
		return this.role === GroupRole.MEMBER;
	}

	promoteToAdmin(): void {
		this.role = GroupRole.ADMIN;
	}

	demoteToMember(): void {
		this.role = GroupRole.MEMBER;
	}
}
