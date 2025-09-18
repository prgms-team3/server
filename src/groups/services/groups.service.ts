import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository, In } from 'typeorm';
import { WorkspaceUser, WorkspaceRole } from '../../workspaces/entities/workspace-user.entity';
import { CreateGroupDto } from '../dto/create-group.dto';
import { UpdateGroupDto } from '../dto/update-group.dto';
import { Group, GroupType } from '../entities/group.entity';
import { GroupUser } from '../entities/group-user.entity';
import { UpdateReservationDto } from 'src/reservations/dto/update-reservation.dto';
import { WorkspacesService } from 'src/workspaces/services/workspaces.service';

@Injectable()
export class GroupsService {
	constructor(
		private readonly workspacesService: WorkspacesService,
		@InjectRepository(Group)
		private groupRepository: Repository<Group>,
		@InjectRepository(GroupUser)
		private groupUserRepository: Repository<GroupUser>,
		@InjectRepository(WorkspaceUser)
		private workspaceUserRepository: Repository<WorkspaceUser>,
	) {}

	async create(createGroupDto: CreateGroupDto, userId: number): Promise<Group> {
		const group = this.groupRepository.create({
			...createGroupDto,
		});

		const savedGroup = await this.groupRepository.save(group);

		// 생성자(현재 유저)를 그룹의 관리자로 자동 추가
		const creatorMember = this.groupUserRepository.create({
			groupId: savedGroup.id,
			userId,
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

		// 워크스페이스 관리자인지 여부로 isAdmin 플래그 설정
		const isWorkspaceAdmin =
			workspaceUser.role === WorkspaceRole.ADMIN ||
			workspaceUser.role === WorkspaceRole.SUPER_ADMIN;

		return groups.map((g) => {
			(g as any).isAdmin = isWorkspaceAdmin;
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

		const isWorkspaceAdmin = await this.workspacesService.isUserAdmin(
			group.workspace?.id ?? group.workspaceId,
			userId,
		);
		if (!isWorkspaceAdmin) {
			throw new ForbiddenException('그룹 관리자만 수정할 수 있습니다');
		}

		Object.assign(group, updateGroupDto);
		return await this.groupRepository.save(group);
	}

	async remove(groupId: number, userId: number): Promise<void> {
		const group = await this.findOne(groupId);

		// 관리자 권한 확인
		if (!this.workspacesService.isUserAdmin(userId, group.workspaceId)) {
			throw new ForbiddenException('관리자만 삭제할 수 있습니다');
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

		// 관리자 권한 확인
		if (!this.workspacesService.isUserAdmin(userId, group.workspaceId)) {
			throw new ForbiddenException('관리자만 삭제할 수 있습니다');
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

		if (group.type === GroupType.ADMIN) {
			throw new ForbiddenException('관리자 그룹에는 가입할 수 없습니다');
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

		// SUPER_ADMIN은 탈퇴 불가
		const workspaceUser = await this.workspaceUserRepository.findOne({
			where: { workspaceId: group.workspaceId, userId },
		});
		if (workspaceUser?.role === WorkspaceRole.SUPER_ADMIN) {
			throw new ForbiddenException('SUPER_ADMIN은 그룹을 탈퇴할 수 없습니다');
		}

		await this.groupUserRepository.remove(member);

		// 관리자 그룹이면 바로 권한 회수
		if (group.type === GroupType.ADMIN) {
			if (workspaceUser && workspaceUser.role !== WorkspaceRole.ADMIN) {
				workspaceUser.role = WorkspaceRole.MEMBER;
				await this.workspaceUserRepository.save(workspaceUser);
			}
		}
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

		// 관리자 그룹은 SUPER_ADMIN만 수정 가능
		if (group.type === GroupType.ADMIN) {
			const actingWorkspaceUser = await this.workspaceUserRepository.findOne({
				where: { workspaceId: group.workspaceId, userId: adminId },
			});
			if (actingWorkspaceUser?.role !== WorkspaceRole.SUPER_ADMIN) {
				throw new ForbiddenException('관리자 그룹은 SUPER_ADMIN만 수정할 수 있습니다');
			}
		}

		// 관리자 권한 확인 (기존 체크 유지, 필요시 중복 제거)
		if (!this.workspacesService.isUserAdmin(adminId, group.workspaceId)) {
			throw new ForbiddenException('관리자만 삭제할 수 있습니다');
		}

		// 이미 그룹 멤버인지 확인 (엔티티 메서드 활용)
		if (group.isUserInGroup(userId)) {
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
		});

		const saved = await this.groupUserRepository.save(groupUser);

		// 관리 그룹이면 워크스페이스 권한 부여
		if (group.type === GroupType.ADMIN) {
			let workspaceUser = await this.workspaceUserRepository.findOne({
				where: { workspaceId: group.workspaceId, userId },
			});
			if (!workspaceUser) {
				workspaceUser = this.workspaceUserRepository.create({
					workspaceId: group.workspaceId,
					userId,
					role: WorkspaceRole.ADMIN,
				});
				await this.workspaceUserRepository.save(workspaceUser);
			} else if (workspaceUser.role === WorkspaceRole.MEMBER) {
				workspaceUser.role = WorkspaceRole.ADMIN;
				await this.workspaceUserRepository.save(workspaceUser);
			}
		}

		return saved;
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

		// 관리자 그룹은 SUPER_ADMIN만 수정 가능
		if (group.type === GroupType.ADMIN) {
			const actingWorkspaceUser = await this.workspaceUserRepository.findOne({
				where: { workspaceId: group.workspaceId, userId: adminId },
			});
			if (actingWorkspaceUser?.role !== WorkspaceRole.SUPER_ADMIN) {
				throw new ForbiddenException('관리자 그룹은 SUPER_ADMIN만 수정할 수 있습니다');
			}
		}

		// 자신을 제거하려는 시도 방지
		if (userId === adminId) {
			throw new BadRequestException('자신을 제거할 수 없습니다. 그룹 탈퇴를 이용해주세요.');
		}

		// 관리자 권한 확인 (FIX: adminId로 확인)
		if (!this.workspacesService.isUserAdmin(adminId, group.workspaceId)) {
			throw new ForbiddenException('관리자만 삭제할 수 있습니다');
		}

		// 제거할 사용자가 멤버인지 확인
		const targetMembership = await this.groupUserRepository.findOne({
			where: { groupId, userId },
		});
		if (!targetMembership) {
			throw new NotFoundException('해당 사용자는 그룹 멤버가 아닙니다.');
		}

		// SUPER_ADMIN은 제거 불가
		const targetWorkspaceUser = await this.workspaceUserRepository.findOne({
			where: { workspaceId: group.workspaceId, userId },
		});
		if (targetWorkspaceUser?.role === WorkspaceRole.SUPER_ADMIN) {
			throw new ForbiddenException('SUPER_ADMIN은 그룹에서 제거할 수 없습니다');
		}

		await this.groupUserRepository.remove(targetMembership);

		// 관리 그룹이면 바로 권한 회수 (관리자 그룹은 워크스페이스 당 하나뿐)
		if (group.type === GroupType.ADMIN) {
			if (targetWorkspaceUser && targetWorkspaceUser.role !== WorkspaceRole.ADMIN) {
				targetWorkspaceUser.role = WorkspaceRole.MEMBER;
				await this.workspaceUserRepository.save(targetWorkspaceUser);
			}
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
		// 관리자 권한 확인
		if (!this.workspacesService.isUserAdmin(userId, group.workspaceId)) {
			throw new ForbiddenException('관리자만 삭제할 수 있습니다');
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
