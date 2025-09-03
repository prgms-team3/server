import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { WorkspaceUser } from '../../workspaces/entities/workspace-user.entity';
import { CreateGroupDto } from '../dto/create-group.dto';
import { UpdateGroupDto } from '../dto/update-group.dto';
import { Group } from '../entities/group.entity';
import { GroupRole, GroupUser } from '../entities/group-user.entity';

@Injectable()
export class GroupsService {
	constructor(
		@InjectRepository(Group)
		private groupRepository: Repository<Group>,
		@InjectRepository(GroupUser)
		private groupMemberRepository: Repository<GroupUser>,
		@InjectRepository(WorkspaceUser)
		private workspaceUserRepository: Repository<WorkspaceUser>,
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
			role: GroupRole.ADMIN, // 생성자는 관리자로 설정
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
	// 성능 최적화를 위한 개선된 findOne 메서드
	async findOne(id: number): Promise<Group> {
		const group = await this.groupRepository
			.createQueryBuilder('group')
			.leftJoinAndSelect('group.creator', 'creator')
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

		// isActive를 false로 설정하여 소프트 딜리트
		group.isActive = false;
		await this.groupRepository.save(group);
	}

	async restore(id: number, userId: number): Promise<Group> {
		// 비활성화된 그룹 조회
		const group = await this.groupRepository.findOne({
			where: { id },
			relations: ['creator', 'workspace', 'members', 'members.user'],
		});

		if (!group) {
			throw new NotFoundException('그룹을 찾을 수 없습니다');
		}

		// 활성화된 그룹인 경우
		if (group.isActive) {
			throw new BadRequestException('이미 활성화된 그룹입니다');
		}

		// 그룹 관리자 권한 확인
		if (!group.isAdmin(userId)) {
			throw new ForbiddenException('그룹 관리자만 복원할 수 있습니다');
		}

		// 복원 실행
		group.isActive = true;
		return await this.groupRepository.save(group);
	}

	async findDeleted(): Promise<Group[]> {
		return await this.groupRepository.find({
			where: { isActive: false },
			relations: ['creator', 'workspace'],
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
		const existingMember = await this.groupMemberRepository.findOne({
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
		const newMember = this.groupMemberRepository.create({
			groupId,
			userId,
			role: GroupRole.MEMBER,
		});

		return await this.groupMemberRepository.save(newMember);
	}

	async leaveGroup(groupId: number, userId: number): Promise<void> {
		// 그룹 존재 확인
		const group = await this.groupRepository.findOne({ where: { id: groupId } });
		if (!group) {
			throw new NotFoundException('그룹을 찾을 수 없습니다');
		}

		// 멤버인지 확인
		const member = await this.groupMemberRepository.findOne({
			where: { groupId, userId },
		});
		if (!member) {
			throw new BadRequestException('그룹 멤버가 아닙니다');
		}

		// 마지막 관리자는 탈퇴 불가
		if (member.role === GroupRole.ADMIN) {
			const otherAdmins = await this.groupMemberRepository.count({
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

		await this.groupMemberRepository.remove(member);
	}

	async getMembers(groupId: number): Promise<GroupUser[]> {
		// 그룹 존재 확인
		const group = await this.groupRepository.findOne({ where: { id: groupId } });
		if (!group) {
			throw new NotFoundException('그룹을 찾을 수 없습니다');
		}

		return await this.groupMemberRepository.find({
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
		const targetMember = await this.groupMemberRepository.findOne({
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
		return await this.groupMemberRepository.save(targetMember);
	}

	async kickMember(groupId: number, targetUserId: number, requestUserId: number): Promise<void> {
		// 권한 확인
		await this.checkAdminPermission(groupId, requestUserId);

		// 자신을 추방할 수 없음
		if (targetUserId === requestUserId) {
			throw new BadRequestException('자신을 추방할 수 없습니다');
		}

		// 대상 멤버 확인
		const targetMember = await this.groupMemberRepository.findOne({
			where: { groupId, userId: targetUserId },
		});
		if (!targetMember) {
			throw new NotFoundException('대상 멤버를 찾을 수 없습니다');
		}

		await this.groupMemberRepository.remove(targetMember);
	}

	private async checkAdminPermission(groupId: number, userId: number): Promise<void> {
		const member = await this.groupMemberRepository.findOne({
			where: { groupId, userId },
		});

		if (!member) {
			throw new ForbiddenException('그룹 멤버가 아닙니다');
		}

		if (member.role !== GroupRole.ADMIN) {
			throw new ForbiddenException('관리자 권한이 필요합니다');
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
