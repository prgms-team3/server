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
import { GroupRole, GroupUser } from './group-user.entity';

export enum GroupType {
	DEPARTMENT = 'DEPARTMENT', // 부서
	ADMIN = 'ADMIN', // 관리자 그룹
}

@Entity('groups')
@Index(['workspaceId'])
export class Group {
	@ApiProperty({ description: '그룹 ID' })
	@PrimaryGeneratedColumn()
	id: number;

	@ApiProperty({ description: '그룹명' })
	@Column({ length: 100 })
	name: string;

	@ApiProperty({ description: '그룹 설명', example: '개발자 그룹', required: false })
	@Column({ type: 'text', nullable: true })
	description?: string;

	@ApiProperty({ description: '최대 멤버 수' })
	@Column({ name: 'max_members', default: 10, type: 'int', unsigned: true })
	maxMembers: number;

	@ApiProperty({
		description: '그룹 타입',
		enum: GroupType,
		example: GroupType.DEPARTMENT,
	})
	@Column({ type: 'enum', enum: GroupType, default: GroupType.DEPARTMENT })
	type: GroupType;

	@ApiProperty({ description: '리더 이름', example: '홍길동', required: false })
	@Column({ name: 'leader_name', length: 20, nullable: true })
	leaderName?: string;

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

	@ApiProperty({ description: '그룹 활성 상태' })
	@Column({ name: 'is_active', default: true })
	isActive: boolean;

	// Relations
	@ApiProperty({ description: '워크스페이스', type: () => Workspace })
	@ManyToOne(() => Workspace, (workspace) => workspace.groups, { lazy: true })
	@JoinColumn({ name: 'workspace_id' })
	workspace: Workspace;

	@ApiProperty({ description: '그룹 멤버들', type: () => [GroupUser] })
	@OneToMany(() => GroupUser, (groupMember) => groupMember.group, {
		cascade: ['remove'], // 그룹 삭제 시 멤버도 함께 삭제
	})
	members: GroupUser[];

	// loadRelationCountAndMap로 주입되는 값 (선택적)
	memberCount?: number;

	// Virtual properties with proper typing
	@ApiProperty({ description: '현재 멤버 수' })
	get currentMemberCount(): number {
		return this.members?.length ?? 0;
	}

	@ApiProperty({ description: '멤버 추가 가능 여부' })
	get canAddMember(): boolean {
		return this.currentMemberCount < this.maxMembers;
	}

	@ApiProperty({ description: '남은 자리 수' })
	get availableSlots(): number {
		return Math.max(0, this.maxMembers - this.currentMemberCount);
	}

	@ApiProperty({ description: '그룹 관리자 목록', type: () => [GroupUser] })
	get admins(): GroupUser[] {
		return this.members?.filter((member) => member.role === GroupRole.ADMIN) ?? [];
	}

	@ApiProperty({ description: '일반 멤버 목록', type: () => [GroupUser] })
	get regularMembers(): GroupUser[] {
		return this.members?.filter((member) => member.role === GroupRole.MEMBER) ?? [];
	}

	// Business logic methods
	isUserMember(userId: number): boolean {
		return this.members?.some((member) => member.userId === userId) ?? false;
	}

	isUserAdmin(userId: number): boolean {
		return (
			this.members?.some(
				(member) => member.userId === userId && member.role === GroupRole.ADMIN,
			) ?? false
		);
	}

	getUserRole(userId: number): GroupRole | null {
		const member = this.members?.find((member) => member.userId === userId);
		return member?.role ?? null;
	}

	canUserJoin(userId: number): boolean {
		return !this.isUserMember(userId) && this.canAddMember && this.isActive;
	}

	canUserManage(userId: number): boolean {
		return this.isUserAdmin(userId);
	}
}
