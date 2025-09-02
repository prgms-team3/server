import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { WorkspaceUser } from '../../workspaces/entities/workspace-user.entity';
import { CreateGroupDto } from '../dto/create-group.dto';
import { UpdateGroupDto } from '../dto/update-group.dto';
import { Group } from '../entities/group.entity';
import { GroupMember, GroupRole } from '../entities/group-member.entity';

@Injectable()
export class GroupsService {
	constructor(
		@InjectRepository(Group)
		private readonly groupRepository: Repository<Group>,
		@InjectRepository(GroupMember)
		private readonly groupMemberRepository: Repository<GroupMember>,
		@InjectRepository(WorkspaceUser)
		private readonly workspaceUserRepository: Repository<WorkspaceUser>,
	) {}

	async create(createGroupDto: CreateGroupDto, creatorId: number): Promise<Group> {
		// 워크스페이스 멤버십 검증
		const workspaceUser = await this.workspaceUserRepository.findOne({
			where: { userId: creatorId, workspaceId: createGroupDto.workspaceId },
		});

		if (!workspaceUser) {
			throw new ForbiddenException('워크스페이스 멤버만 그룹을 생성할 수 있습니다');
		}

		const group = this.groupRepository.create({
			...createGroupDto,
			creatorId,
		});

		const savedGroup = await this.groupRepository.save(group);

		// 생성자를 그룹의 관리자로 자동 추가
		const creatorMember = this.groupMemberRepository.create({
			groupId: savedGroup.id,
			userId: creatorId,
			role: GroupRole.ADMIN,
		});

		await this.groupMemberRepository.save(creatorMember);

		return savedGroup;
	}

	async findByWorkspace(workspaceId: number): Promise<Group[]> {
		return await this.groupRepository.find({
			where: { workspaceId },
			relations: ['creator', 'members', 'members.user'],
			order: { createdAt: 'DESC' }, // 최신순 정렬 추가
		});
	}

	async findAll(): Promise<Group[]> {
		return await this.groupRepository.find({
			relations: ['creator', 'workspace', 'members', 'members.user'],
			order: { createdAt: 'DESC' }, // 최신순 정렬 추가
		});
	}

	// 멤버 수 카운트 최적화
	async findOne(id: number): Promise<Group> {
		const group = await this.groupRepository
			.createQueryBuilder('group')
			.leftJoinAndSelect('group.creator', 'creator')
			.leftJoinAndSelect('group.workspace', 'workspace')
			.leftJoinAndSelect('group.members', 'members')
			.leftJoinAndSelect('members.user', 'user')
			.where('group.id = :id', { id })
			.getOne();

		if (!group) {
			throw new NotFoundException('그룹을 찾을 수 없습니다');
		}

		return group;
	}

	async update(id: number, updateGroupDto: UpdateGroupDto, userId: number): Promise<Group> {
		const group = await this.findOne(id);

		// 그룹 관리자 권한 확인
		if (!group.isAdmin(userId)) {
			throw new ForbiddenException('그룹 관리자만 수정할 수 있습니다');
		}

		Object.assign(group, updateGroupDto);
		return await this.groupRepository.save(group);
	}

	async remove(id: number, userId: number): Promise<void> {
		const group = await this.findOne(id);

		// 그룹 관리자 권한 확인
		if (!group.isAdmin(userId)) {
			throw new ForbiddenException('그룹 관리자만 삭제할 수 있습니다');
		}

		// 소프트 딜리트 실행
		await this.groupRepository.softDelete(id);
	}

	async restore(id: number, userId: number): Promise<Group> {
		// 삭제된 그룹도 포함해서 조회
		const group = await this.groupRepository.findOne({
			where: { id },
			withDeleted: true,
			relations: ['creator', 'workspace', 'members', 'members.user'],
		});

		if (!group) {
			throw new NotFoundException('그룹을 찾을 수 없습니다');
		}

		// 삭제되지 않은 그룹인 경우
		if (!group.deletedAt) {
			throw new ForbiddenException('삭제되지 않은 그룹입니다');
		}

		// 그룹 관리자 권한 확인
		if (!group.isAdmin(userId)) {
			throw new ForbiddenException('그룹 관리자만 복원할 수 있습니다');
		}

		// 복원 실행
		await this.groupRepository.restore(id);
		return await this.findOne(id);
	}

	async findDeleted(): Promise<Group[]> {
		return await this.groupRepository.find({
			withDeleted: true,
			where: { deletedAt: Not(IsNull()) },
			relations: ['creator', 'workspace'],
		});
	}

	async joinGroup(groupId: number, userId: number): Promise<GroupMember> {
		const group = await this.findOne(groupId);

		// 이미 멤버인지 확인
		const existingMember = await this.groupMemberRepository.findOne({
			where: { groupId, userId },
		});

		if (existingMember) {
			throw new ForbiddenException('이미 그룹의 멤버입니다');
		}

		// 그룹 정원 확인
		if (!group.canAddMember) {
			throw new ForbiddenException('그룹 정원이 가득찼습니다');
		}

		// 워크스페이스 멤버인지 확인
		const workspaceUser = await this.workspaceUserRepository.findOne({
			where: { userId, workspaceId: group.workspaceId },
		});

		if (!workspaceUser) {
			throw new ForbiddenException('워크스페이스 멤버만 그룹에 가입할 수 있습니다');
		}

		// 새 멤버 생성
		const member = this.groupMemberRepository.create({
			groupId,
			userId,
			role: GroupRole.MEMBER,
		});

		return await this.groupMemberRepository.save(member);
	}

	async leaveGroup(groupId: number, userId: number): Promise<void> {
		const group = await this.findOne(groupId);

		// 생성자는 그룹을 떠날 수 없음
		if (group.creatorId === userId) {
			throw new ForbiddenException('그룹 생성자는 그룹을 떠날 수 없습니다');
		}

		const member = await this.groupMemberRepository.findOne({
			where: { groupId, userId },
		});

		if (!member) {
			throw new NotFoundException('그룹 멤버를 찾을 수 없습니다');
		}

		// 물리적 삭제 실행
		await this.groupMemberRepository.remove(member);
	}

	async promoteToAdmin(
		groupId: number,
		targetUserId: number,
		requestUserId: number,
	): Promise<GroupMember> {
		const group = await this.findOne(groupId);

		// 요청자가 관리자인지 확인
		if (!group.isAdmin(requestUserId)) {
			throw new ForbiddenException('그룹 관리자만 다른 멤버를 관리자로 승격시킬 수 있습니다');
		}

		const member = await this.groupMemberRepository.findOne({
			where: { groupId, userId: targetUserId },
			relations: ['user'],
		});

		if (!member) {
			throw new NotFoundException('그룹 멤버를 찾을 수 없습니다');
		}

		member.promoteToAdmin();
		return await this.groupMemberRepository.save(member);
	}

	async demoteToMember(
		groupId: number,
		targetUserId: number,
		requestUserId: number,
	): Promise<GroupMember> {
		const group = await this.findOne(groupId);

		// 요청자가 관리자인지 확인
		if (!group.isAdmin(requestUserId)) {
			throw new ForbiddenException('그룹 관리자만 다른 관리자를 멤버로 강등시킬 수 있습니다');
		}

		// 자기 자신은 강등시킬 수 없음
		if (requestUserId === targetUserId) {
			throw new ForbiddenException('자기 자신을 강등시킬 수 없습니다');
		}

		// 그룹 생성자는 강등시킬 수 없음
		if (group.creatorId === targetUserId) {
			throw new ForbiddenException('그룹 생성자는 강등시킬 수 없습니다');
		}

		const member = await this.groupMemberRepository.findOne({
			where: { groupId, userId: targetUserId },
			relations: ['user'],
		});

		if (!member) {
			throw new NotFoundException('그룹 멤버를 찾을 수 없습니다');
		}

		member.demoteToMember();
		return await this.groupMemberRepository.save(member);
	}

	async kickMember(groupId: number, targetUserId: number, requestUserId: number): Promise<void> {
		const group = await this.findOne(groupId);

		// 요청자가 관리자인지 확인
		if (!group.isAdmin(requestUserId)) {
			throw new ForbiddenException('그룹 관리자만 멤버를 추방할 수 있습니다');
		}

		// 자기 자신은 추방할 수 없음
		if (requestUserId === targetUserId) {
			throw new ForbiddenException('자기 자신을 추방할 수 없습니다');
		}

		// 그룹 생성자는 추방할 수 없음
		if (group.creatorId === targetUserId) {
			throw new ForbiddenException('그룹 생성자는 추방할 수 없습니다');
		}

		const member = await this.groupMemberRepository.findOne({
			where: { groupId, userId: targetUserId },
		});

		if (!member) {
			throw new NotFoundException('그룹 멤버를 찾을 수 없습니다');
		}

		// 물리적 삭제 실행
		await this.groupMemberRepository.remove(member);
	}
}
