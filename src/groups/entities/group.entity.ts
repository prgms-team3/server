import { ApiProperty } from '@nestjs/swagger';
import {
	Column,
	CreateDateColumn,
	DeleteDateColumn,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	OneToMany,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { WorkspaceUser } from '../../workspaces/entities/workspace-user.entity';
import { GroupMember, GroupRole } from './group-member.entity';

@Entity('groups')
@Index(['workspaceId']) // 워크스페이스별 그룹 조회 최적화
@Index(['creatorId']) // 생성자별 그룹 조회 최적화
export class Group {
	@ApiProperty({ description: '그룹 ID' })
	@PrimaryGeneratedColumn()
	id: number;

	@ApiProperty({ description: '그룹명' })
	@Column({ length: 100 })
	name: string;

	@ApiProperty({ description: '그룹 설명', required: false })
	@Column({ type: 'text', nullable: true })
	description?: string;

	@ApiProperty({ description: '그룹 생성자 ID' })
	@Column({ name: 'creator_id' })
	creatorId: number;

	@ApiProperty({ description: '최대 멤버 수' })
	@Column({ name: 'max_members', default: 10 })
	maxMembers: number;

	@ApiProperty({ description: '워크스페이스 ID' })
	@Column({ name: 'workspace_id' })
	workspaceId: number;

	@ApiProperty({ description: '생성일시' })
	@CreateDateColumn({ name: 'created_at' })
	createdAt: Date;

	@ApiProperty({ description: '수정일시' })
	@UpdateDateColumn({ name: 'updated_at' })
	updatedAt: Date;

	@ApiProperty({ description: '삭제일시', required: false })
	@DeleteDateColumn({ name: 'deleted_at' })
	deletedAt?: Date;

	// Relations
	@ApiProperty({ description: '그룹 생성자', type: () => User })
	@ManyToOne(() => User, { eager: true })
	@JoinColumn({ name: 'creator_id' })
	creator: User;

	@ApiProperty({ description: '워크스페이스', type: () => Workspace })
	@ManyToOne(() => Workspace)
	@JoinColumn({ name: 'workspace_id' })
	workspace: Workspace;

	@OneToMany(
		() => GroupMember,
		(groupMember) => groupMember.group,
	)
	members: GroupMember[];

	// 현재 멤버 수 계산을 위한 가상 컬럼
	@ApiProperty({ description: '현재 멤버 수' })
	get currentMemberCount(): number {
		if (!this.members) return 0;
		// GroupMember는 물리적 삭제를 사용하므로 단순히 배열 길이 반환
		return this.members.length;
	}

	// 멤버 추가 가능 여부 확인
	@ApiProperty({ description: '멤버 추가 가능 여부' })
	get canAddMember(): boolean {
		return this.currentMemberCount < this.maxMembers;
	}

	// 남은 자리 수
	@ApiProperty({ description: '남은 자리 수' })
	get availableSlots(): number {
		return Math.max(0, this.maxMembers - this.currentMemberCount);
	}

	// 멤버 여부 확인
	isMember(userId: number): boolean {
		return this.members?.some((member) => member.userId === userId) || false;
	}

	// 그룹 관리자 여부 확인 (생성자는 항상 관리자)
	isAdmin(userId: number): boolean {
		if (this.creatorId === userId) return true;
		return (
			this.members?.some((member) => member.userId === userId && member.role === GroupRole.ADMIN) ||
			false
		);
	}

	// 워크스페이스 멤버십 검증을 위한 메서드 추가
	validateCreatorWorkspaceMembership(workspaceUsers: WorkspaceUser[]): boolean {
		return workspaceUsers.some((wu) => wu.userId === this.creatorId);
	}
}
