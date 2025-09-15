import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository, In } from 'typeorm';
import { WorkspaceUser } from '../../workspaces/entities/workspace-user.entity';
import { CreateGroupDto } from '../dto/create-group.dto';
import { UpdateGroupDto } from '../dto/update-group.dto';
import { Group, GroupType } from '../entities/group.entity';
import { GroupRole, GroupUser } from '../entities/group-user.entity';
import { UpdateReservationDto } from 'src/reservations/dto/update-reservation.dto';

@Injectable()
export class GroupsService {
	constructor(
		@InjectRepository(Group)
		private groupRepository: Repository<Group>,
		@InjectRepository(GroupUser)
		private groupUserRepository: Repository<GroupUser>,
		@InjectRepository(WorkspaceUser)
		private workspaceUserRepository: Repository<WorkspaceUser>,
	) {}

	async create(createGroupDto: CreateGroupDto, userId: number): Promise<Group> {
		const { workspaceId } = createGroupDto;

		// 워크스페이스 멤버십 검증
		await this.validateWorkspaceMembership(userId, workspaceId);

		const group = this.groupRepository.create({
			...createGroupDto,
		});

		const savedGroup = await this.groupRepository.save(group);

		// 생성자(현재 유저)를 그룹의 관리자로 자동 추가
		const creatorMember = this.groupUserRepository.create({
			groupId: savedGroup.id,
			userId,
			role: GroupRole.ADMIN,
		});

		await this.groupUserRepository.save(creatorMember); // 저장 추가

		return savedGroup;
	}

	/**
	 * 워크스페이스에 속한 활성 그룹만 조회하는 메서드 예시
	 */
	async findByWorkspace(workspaceId: number, userId: number): Promise<Group[]> {
		const groups = await this.groupRepository
			.createQueryBuilder('group')
			.where('group.workspaceId = :workspaceId', { workspaceId })
			.andWhere('group.isActive = :isActive', { isActive: true })
			.loadRelationCountAndMap('group.memberCount', 'group.members')
			.orderBy('group.createdAt', 'DESC')
			.getMany();

		const workspaceUser = await this.workspaceUserRepository.findOne({
			where: { workspaceId, userId },
		});
		if (!workspaceUser) {
			throw new ForbiddenException('워크스페이스 멤버만 그룹을 조회할 수 있습니다');
		}

		// 현재 유저가 관리자인 그룹 목록 조회 후 매핑
		const groupIds = groups.map((g) => g.id);
		const adminMemberships = await this.groupUserRepository.find({
			where: { userId, groupId: In(groupIds), role: GroupRole.ADMIN },
			select: ['groupId'],
		});
		const adminSet = new Set(adminMemberships.map((m) => m.groupId));

		return groups.map((g) => {
			// 결과에 isAdmin 플래그를 추가
			(g as any).isAdmin = adminSet.has(g.id);
			return g;
		});
	}

	async findAll(): Promise<Group[]> {
		return await this.groupRepository.find({
			relations: ['workspace', 'members', 'members.user'],
			order: { createdAt: 'DESC' }, // 최신순 정렬 추가
		});
	}

	// 멤버 수 카운트 최적화
	// 성능 최적화를 위한 개선된 findOne 메서드
	async findOne(id: number): Promise<Group> {
		const group = await this.groupRepository
			.createQueryBuilder('group')
			.leftJoinAndSelect('group.workspace', 'workspace')
			.leftJoinAndSelect('group.members', 'members')
			.leftJoinAndSelect('members.user', 'user')
			.loadRelationCountAndMap('group.memberCount', 'group.members')
			.where('group.id = :id', { id })
			.andWhere('group.isActive = :isActive', { isActive: true })
			.getOne();

		if (!group) {
			throw new NotFoundException('그룹을 찾을 수 없습니다');
		}

		return group;
	}

	async update(id: number, updateGroupDto: UpdateGroupDto, userId: number): Promise<Group> {
		const group = await this.findOne(id);

		// 그룹 관리자 권한 확인
		if (!group.isUserAdmin(userId)) {
			throw new ForbiddenException('그룹 관리자만 수정할 수 있습니다');
		}

		Object.assign(group, updateGroupDto);
		return await this.groupRepository.save(group);
	}

	async remove(id: number, userId: number): Promise<void> {
		const group = await this.findOne(id);

		// 그룹 관리자 권한 확인
		if (!group.isUserAdmin(userId)) {
			throw new ForbiddenException('그룹 관리자만 삭제할 수 있습니다');
		}

		// isActive를 false로 설정하여 소프트 딜리트
		group.isActive = false;
		await this.groupRepository.save(group);
	}

	async restore(id: number, userId: number): Promise<Group> {
		// 비활성화된 그룹 조회
		const group = await this.groupRepository.findOne({
			where: { id },
			relations: ['workspace', 'members', 'members.user'],
		});

		if (!group) {
			throw new NotFoundException('그룹을 찾을 수 없습니다');
		}

		// 활성화된 그룹인 경우
		if (group.isActive) {
			throw new BadRequestException('이미 활성화된 그룹입니다');
		}

		// 그룹 관리자 권한 확인
		if (!group.isUserAdmin(userId)) {
			throw new ForbiddenException('그룹 관리자만 복원할 수 있습니다');
		}

		// 복원 실행
		group.isActive = true;
		return await this.groupRepository.save(group);
	}

	async findDeleted(): Promise<Group[]> {
		return await this.groupRepository.find({
			where: { isActive: false },
			relations: ['workspace'],
		});
	}

	async joinGroup(groupId: number, userId: number): Promise<GroupUser> {
		// 그룹 존재 확인
		const group = await this.groupRepository.findOne({ where: { id: groupId } });
		if (!group) {
			throw new NotFoundException('그룹을 찾을 수 없습니다');
		}

		// 워크스페이스 멤버십 검증
		await this.validateWorkspaceMembership(userId, group.workspaceId);

		// 이미 멤버인지 확인
		const existingMember = await this.groupUserRepository.findOne({
			where: { groupId, userId },
		});
		if (existingMember) {
			throw new BadRequestException('이미 그룹 멤버입니다');
		}

		// 그룹이 비활성 상태인지 확인
		if (!group.isActive) {
			throw new ForbiddenException('비활성화된 그룹에는 가입할 수 없습니다');
		}

		// 최대 멤버 수 확인
		if (!group.canAddMember) {
			throw new BadRequestException('그룹 정원이 가득 찼습니다');
		}

		// 멤버로 가입
		const newMember = this.groupUserRepository.create({
			groupId,
			userId,
			role: GroupRole.MEMBER,
		});

		return await this.groupUserRepository.save(newMember);
	}

	async leaveGroup(groupId: number, userId: number): Promise<void> {
		// 그룹 존재 확인
		const group = await this.groupRepository.findOne({ where: { id: groupId } });
		if (!group) {
			throw new NotFoundException('그룹을 찾을 수 없습니다');
		}

		// 멤버인지 확인
		const member = await this.groupUserRepository.findOne({
			where: { groupId, userId },
		});
		if (!member) {
			throw new BadRequestException('그룹 멤버가 아닙니다');
		}

		// 마지막 관리자는 탈퇴 불가
		if (member.role === GroupRole.ADMIN) {
			const otherAdmins = await this.groupUserRepository.count({
				where: {
					groupId,
					role: GroupRole.ADMIN,
					userId: Not(userId),
				},
			});

			if (otherAdmins === 0) {
				throw new ConflictException(
					'마지막 관리자는 탈퇴할 수 없습니다. 다른 멤버를 관리자로 지정한 후 탈퇴해주세요',
				);
			}
		}

		await this.groupUserRepository.remove(member);
	}

	async getMembers(groupId: number): Promise<GroupUser[]> {
		// 그룹 존재 확인
		const group = await this.groupRepository.findOne({ where: { id: groupId } });
		if (!group) {
			throw new NotFoundException('그룹을 찾을 수 없습니다');
		}

		return await this.groupUserRepository.find({
			where: { groupId },
			relations: ['user'],
		});
	}

	async changeRole(
		groupId: number,
		targetUserId: number,
		newRole: GroupRole, // ADMIN 또는 MEMBER만 가능
		requestUserId: number,
	): Promise<GroupUser> {
		// 권한 확인
		await this.checkAdminPermission(groupId, requestUserId);

		// 대상 멤버 확인
		const targetMember = await this.groupUserRepository.findOne({
			where: { groupId, userId: targetUserId },
		});
		if (!targetMember) {
			throw new NotFoundException('대상 멤버를 찾을 수 없습니다');
		}

		// 자신의 역할은 변경할 수 없음
		if (targetUserId === requestUserId) {
			throw new BadRequestException('자신의 역할은 변경할 수 없습니다');
		}

		targetMember.role = newRole;
		return await this.groupUserRepository.save(targetMember);
	}

	async promoteToAdmin(
		groupId: number,
		targetUserId: number,
		requestUserId: number,
	): Promise<GroupUser> {
		// 권한 확인
		await this.checkAdminPermission(groupId, requestUserId);

		// 대상 멤버 확인
		const targetMember = await this.groupUserRepository.findOne({
			where: { groupId, userId: targetUserId },
		});
		if (!targetMember) {
			throw new NotFoundException('대상 멤버를 찾을 수 없습니다');
		}

		// 자신을 승진시킬 수 없음
		if (targetUserId === requestUserId) {
			throw new BadRequestException('자신을 승진시킬 수 없습니다');
		}

		// 이미 관리자인 경우
		if (targetMember.role === GroupRole.ADMIN) {
			throw new BadRequestException('이미 관리자입니다');
		}

		targetMember.role = GroupRole.ADMIN;
		return await this.groupUserRepository.save(targetMember);
	}

	async demoteToMember(
		groupId: number,
		targetUserId: number,
		requestUserId: number,
	): Promise<GroupUser> {
		// 권한 확인
		await this.checkAdminPermission(groupId, requestUserId);

		// 대상 멤버 확인
		const targetMember = await this.groupUserRepository.findOne({
			where: { groupId, userId: targetUserId },
		});
		if (!targetMember) {
			throw new NotFoundException('대상 멤버를 찾을 수 없습니다');
		}

		// 자신을 강등시킬 수 없음
		if (targetUserId === requestUserId) {
			throw new BadRequestException('자신을 강등시킬 수 없습니다');
		}

		// 이미 일반 멤버인 경우
		if (targetMember.role === GroupRole.MEMBER) {
			throw new BadRequestException('이미 일반 멤버입니다');
		}

		// 마지막 관리자인지 확인
		const otherAdmins = await this.groupUserRepository.count({
			where: {
				groupId,
				role: GroupRole.ADMIN,
				userId: Not(targetUserId),
			},
		});

		if (otherAdmins === 0) {
			throw new BadRequestException('마지막 관리자는 강등할 수 없습니다');
		}

		targetMember.role = GroupRole.MEMBER;
		return await this.groupUserRepository.save(targetMember);
	}

	/**
	 * 관리자가 멤버를 그룹에 추가
	 */
	async addMember(groupId: number, userId: number, adminId: number): Promise<GroupUser> {
		// 그룹 존재 및 멤버 정보와 함께 조회
		const group = await this.groupRepository.findOne({
			where: { id: groupId },
			relations: ['members', 'workspace'],
		});

		if (!group) {
			throw new NotFoundException('그룹을 찾을 수 없습니다.');
		}

		// 관리자 권한 확인 (엔티티 메서드 활용)
		if (!group.isUserAdmin(adminId)) {
			throw new ForbiddenException('그룹 멤버를 추가할 권한이 없습니다.');
		}

		// 이미 그룹 멤버인지 확인 (엔티티 메서드 활용)
		if (group.isUserMember(userId)) {
			throw new BadRequestException('이미 그룹 멤버입니다.');
		}

		// 워크스페이스 멤버십 확인
		await this.validateWorkspaceMembership(userId, group.workspaceId);

		// 최대 멤버 수 확인
		if (!group.canAddMember) {
			throw new BadRequestException('그룹 정원이 가득 찼습니다.');
		}

		// 그룹에 멤버 추가
		const groupUser = this.groupUserRepository.create({
			groupId,
			userId,
			role: GroupRole.MEMBER,
		});

		return await this.groupUserRepository.save(groupUser);
	}

	/**
	 * 관리자가 멤버를 그룹에서 제거
	 */
	async removeMember(groupId: number, userId: number, adminId: number): Promise<void> {
		// 그룹 존재 및 멤버 정보와 함께 조회
		const group = await this.groupRepository.findOne({
			where: { id: groupId },
			relations: ['members'],
		});

		if (!group) {
			throw new NotFoundException('그룹을 찾을 수 없습니다.');
		}

		// 자신을 제거하려는 시도 방지
		if (userId === adminId) {
			throw new BadRequestException('자신을 제거할 수 없습니다. 그룹 탈퇴를 이용해주세요.');
		}

		// 관리자 권한 확인 (엔티티 메서드 활용)
		if (!group.isUserAdmin(adminId)) {
			throw new ForbiddenException('그룹 멤버를 제거할 권한이 없습니다.');
		}

		// 제거할 사용자가 멤버인지 확인 (엔티티 메서드 활용)
		if (!group.isUserMember(userId)) {
			throw new NotFoundException('해당 사용자는 그룹 멤버가 아닙니다.');
		}

		// 제거할 멤버의 역할 확인
		const targetRole = group.getUserRole(userId);

		// 관리자를 제거하려는 경우 마지막 관리자인지 확인
		if (targetRole === GroupRole.ADMIN) {
			const adminCount =
				group.members?.filter((member) => member.role === GroupRole.ADMIN).length ?? 0;
			if (adminCount <= 1) {
				throw new BadRequestException('마지막 관리자는 제거할 수 없습니다.');
			}
		}

		// 실제 멤버 엔티티 조회 후 제거
		const targetMembership = await this.groupUserRepository.findOne({
			where: { groupId, userId },
		});

		if (targetMembership) {
			await this.groupUserRepository.remove(targetMembership);
		}
	}

	private async checkAdminPermission(groupId: number, userId: number): Promise<void> {
		const group = await this.groupRepository.findOne({
			where: { id: groupId },
			relations: ['members'],
		});

		if (!group) {
			throw new NotFoundException('그룹을 찾을 수 없습니다.');
		}

		if (!group.isUserAdmin(userId)) {
			throw new ForbiddenException('관리자 권한이 필요합니다.');
		}
	}

	// 워크스페이스 멤버십 검증 개선
	private async validateWorkspaceMembership(userId: number, workspaceId: number): Promise<void> {
		const workspaceUser = await this.workspaceUserRepository.findOne({
			where: { userId, workspaceId },
		});

		if (!workspaceUser) {
			throw new ForbiddenException('워크스페이스 멤버만 이 작업을 수행할 수 있습니다');
		}
	}
}
