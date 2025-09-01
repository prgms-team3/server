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
@Unique(['groupId', 'userId']) // 같은 그룹에 같은 사용자가 중복으로 들어가는 것 방지
@Index(['groupId']) // 그룹별 멤버 조회 최적화
@Index(['userId']) // 사용자별 그룹 조회 최적화
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
	@ManyToOne(
		() => Group,
		(group) => group.members,
		{
			onDelete: 'CASCADE', // 그룹 삭제 시 멤버 자동 삭제
		},
	)
	@JoinColumn({ name: 'group_id' })
	group: Group;

	@ApiProperty({ description: '사용자 정보', type: () => User })
	@ManyToOne(() => User, { eager: true }) // 사용자 정보는 항상 로드
	@JoinColumn({ name: 'user_id' })
	user: User;

	// 비즈니스 로직 메서드
	isAdmin(): boolean {
		return this.role === GroupRole.ADMIN;
	}

	isMember(): boolean {
		return this.role === GroupRole.MEMBER;
	}

	// 역할 변경 메서드
	promoteToAdmin(): void {
		this.role = GroupRole.ADMIN;
	}

	demoteToMember(): void {
		this.role = GroupRole.MEMBER;
	}
}
