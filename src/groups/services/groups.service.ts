import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

	async findAll(): Promise<Group[]> {
		return await this.groupRepository.find({
			where: { isActive: true },
			relations: ['creator', 'workspace', 'members', 'members.user'],
		});
	}

	async findByWorkspace(workspaceId: number): Promise<Group[]> {
		return await this.groupRepository.find({
			where: { workspaceId, isActive: true },
			relations: ['creator', 'members', 'members.user'],
		});
	}

	async findOne(id: number): Promise<Group> {
		const group = await this.groupRepository.findOne({
			where: { id, isActive: true },
			relations: ['creator', 'workspace', 'members', 'members.user'],
		});

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

		group.isActive = false;
		await this.groupRepository.save(group);
	}

	async joinGroup(groupId: number, userId: number): Promise<GroupMember> {
		const group = await this.findOne(groupId);

		// 이미 멤버인지 확인
		if (group.isMember(userId)) {
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

		await this.groupMemberRepository.remove(member);
	}
}
