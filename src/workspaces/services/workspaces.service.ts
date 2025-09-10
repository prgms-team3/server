import * as crypto from 'node:crypto';
import { Injectable } from '@nestjs/common'; // Inject 제거
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { ErrorCode } from '../../common/constants/error-codes';
import { AppException } from '../../common/exceptions/app.exception';
import { UsersService } from '../../users/services/users.service';
import { AddUserToWorkspaceDto } from '../dto/add-user-to-workspace.dto';
import { CreateWorkspaceDto } from '../dto/create-workspace.dto';
import { UpdateWorkspaceDto } from '../dto/update-workspace.dto';
import { UseInvitationCodeDto } from '../dto/use-invitation-code.dto';
import { WorkspaceQueryDto } from '../dto/workspace-query.dto';
import { InvitationHistory, InvitationStatus } from '../entities/invitation-history.entity';
import { Workspace } from '../entities/workspace.entity';
import { WorkspaceInvitationCode } from '../entities/workspace-invitation-code.entity';
import { WorkspaceRole, WorkspaceUser } from '../entities/workspace-user.entity';
import {
	findUserWorkspacesResponseDto,
	WorkspaceCreateResponseDto,
	WorkspaceWithActiveInvitationCode,
} from '../dto/workspace-response.dto';
import { UpdateWorkspaceUserDto } from '../dto/update-user-to-workspace.dto';

@Injectable()
export class WorkspacesService {
	constructor(
		@InjectRepository(Workspace)
		private workspaceRepository: Repository<Workspace>,
		@InjectRepository(WorkspaceUser)
		private workspaceUserRepository: Repository<WorkspaceUser>,
		@InjectRepository(WorkspaceInvitationCode)
		private invitationCodeRepository: Repository<WorkspaceInvitationCode>,
		@InjectRepository(InvitationHistory)
		private invitationHistoryRepository: Repository<InvitationHistory>,
		private usersService: UsersService, // @InjectRepository(User) 제거
	) {}

	/**
	 * 워크스페이스 생성
	 */
	async create(
		createWorkspaceDto: CreateWorkspaceDto,
		userId: number,
	): Promise<WorkspaceCreateResponseDto> {
		const superAdmin = await this.usersService.findOne(userId);
		if (!superAdmin) {
			throw new AppException(ErrorCode.USER_NOT_FOUND);
		}

		// 워크스페이스 생성 시 superAdminName 필드 추가
		const workspace = this.workspaceRepository.create({
			...createWorkspaceDto,
			superAdminName: superAdmin.name, // 실제 사용자 이름으로 설정
		});
		const savedWorkspace = await this.workspaceRepository.save(workspace);

		// 생성자를 SUPER_ADMIN로 추가
		const workspaceUser = this.workspaceUserRepository.create({
			workspaceId: savedWorkspace.id,
			userId,
			role: WorkspaceRole.SUPER_ADMIN,
		});
		await this.workspaceUserRepository.save(workspaceUser);

		// 초대 코드 생성
		await this.createInvitationCode(savedWorkspace.id, userId);

		// 활성 초대코드 조회
		const activeInvitationCode = await this.getInvitationCodes(savedWorkspace.id, userId);

		// 워크스페이스 반환 (초대코드는 문자열로)
		const result: WorkspaceCreateResponseDto = {
			workspace: savedWorkspace,
			invitationCode: activeInvitationCode?.code || null,
		};

		return result;
	}

	/**
	 * 워크스페이스 목록 조회 (사용자가 속한)
	 */
	async findUserWorkspaces(
		query: WorkspaceQueryDto,
		userId: number,
	): Promise<findUserWorkspacesResponseDto> {
		const { page = 1, limit = 10, search } = query;
		const skip = (page - 1) * limit;

		const queryBuilder = this.workspaceRepository
			.createQueryBuilder('workspace')
			.leftJoinAndSelect('workspace.workspaceUsers', 'workspaceUsers')
			.leftJoinAndSelect('workspace.invitationCodes', 'invitationCodes')
			.where('workspaceUsers.userId = :userId', { userId })
			.andWhere('workspace.deleted = :deleted', { deleted: false })
			.andWhere((qb) => {
				// ADMIN 이상 권한을 가진 워크스페이스는 isActive 상관없이 조회
				// MEMBER 권한만 있는 워크스페이스는 isActive가 true인 것만 조회
				const subQuery = qb
					.subQuery()
					.select('1')
					.from('workspace_user', 'wu')
					.where('wu.workspaceId = workspace.id')
					.andWhere('wu.userId = :userId', { userId })
					.andWhere('(wu.role = :adminRole OR wu.role = :superAdminRole)', {
						adminRole: WorkspaceRole.ADMIN,
						superAdminRole: WorkspaceRole.SUPER_ADMIN,
					})
					.getQuery();

				return `(workspace.isActive = true OR EXISTS ${subQuery})`;
			});

		if (search) {
			queryBuilder.andWhere(
				'(workspace.name LIKE :search OR workspace.description LIKE :search)',
				{
					search: `%${search}%`,
				},
			);
		}

		const total = await queryBuilder.getCount();
		let workspaces = await queryBuilder
			.orderBy('workspace.createdAt', 'DESC')
			.skip(skip)
			.take(limit)
			.getMany();

		// 각 워크스페이스에 대해 활성화된 초대 코드와 사용자 역할 정보 처리
		const workspacesWithActiveInvitationCodes = workspaces.map((workspace) => {
			const activeInvitationCode = workspace.invitationCodes.find((code) => code.isActive);
			const userCount = workspace.workspaceUsers.length; // 워크스페이스에 속한 유저 수 계산

			// 사용자의 해당 워크스페이스에서의 역할 확인
			const userRole =
				workspace.workspaceUsers.find((wu) => wu.userId === userId)?.role ||
				WorkspaceRole.MEMBER;
			const isAdmin =
				userRole === WorkspaceRole.ADMIN || userRole === WorkspaceRole.SUPER_ADMIN;

			return {
				...workspace,
				activeInvitationCode: activeInvitationCode?.code || null,
				userCount,
				userRole, // 사용자 역할 정보 추가
			};
		});

		return {
			workspaces: workspacesWithActiveInvitationCodes as WorkspaceWithActiveInvitationCode[],
			total,
		};
	}

	/**
	 * 워크스페이스 상세 조회 (개선된 버전)
	 */
	async findOne(id: number, userId: number): Promise<Workspace> {
		// 권한 확인하면서 사용자 역할 정보도 가져옴
		const userInfo = await this.checkPermission(userId, id, WorkspaceRole.MEMBER);

		// 사용자 역할에 따라 조회 조건 설정
		// ADMIN 또는 SUPER_ADMIN은 비활성 워크스페이스도 볼 수 있음
		const isAdmin =
			userInfo.role === WorkspaceRole.ADMIN || userInfo.role === WorkspaceRole.SUPER_ADMIN;
		const whereCondition = isAdmin
			? { id, deleted: false }
			: { id, isActive: true, deleted: false };

		const workspace = await this.workspaceRepository.findOne({
			where: whereCondition,
			relations: ['workspaceUsers', 'workspaceUsers.user', 'invitationCodes'],
		});

		if (!workspace) {
			throw new AppException(ErrorCode.WORKSPACE_NOT_FOUND);
		}

		return workspace;
	}

	/**
	 * 워크스페이스 수정
	 */
	async update(
		id: number,
		updateWorkspaceDto: UpdateWorkspaceDto,
		userId: number,
	): Promise<WorkspaceCreateResponseDto> {
		// 관리자 권한 확인
		await this.checkUserIsAdmin(userId, id);

		const workspace = await this.workspaceRepository.findOne({
			where: { id, isActive: true },
		});

		if (!workspace) {
			throw new AppException(ErrorCode.WORKSPACE_NOT_FOUND);
		}

		Object.assign(workspace, updateWorkspaceDto);
		const updateWorkspace = await this.workspaceRepository.save(workspace);

		// 활성 초대코드 찾기
		const activeInvitationCode = await this.getInvitationCodes(id, userId);

		return {
			workspace: updateWorkspace,
			invitationCode: activeInvitationCode?.code || null,
		};
	}

	/**
	 * 워크스페이스 비활성화
	 */
	async deActivate(id: number, userId: number): Promise<void> {
		// 관리자 권한 확인
		await this.checkUserIsAdmin(userId, id);

		const workspace = await this.workspaceRepository.findOne({
			where: { id, isActive: true },
		});

		if (!workspace) {
			throw new AppException(ErrorCode.WORKSPACE_NOT_FOUND);
		}

		workspace.isActive = false; // 비활성화
		await this.workspaceRepository.save(workspace);
	}

	/**
	 * 워크스페이스 활성화
	 */
	async activate(id: number, userId: number): Promise<void> {
		// 관리자 권한 확인
		await this.checkUserIsAdmin(userId, id);

		const workspace = await this.workspaceRepository.findOne({
			where: { id, isActive: false },
		});

		if (!workspace) {
			throw new AppException(ErrorCode.WORKSPACE_NOT_FOUND);
		}

		workspace.isActive = true; // 활성화
		await this.workspaceRepository.save(workspace);
	}

	/**
	 * 워크스페이스 삭제 (soft delete)
	 */
	async remove(id: number, userId: number): Promise<void> {
		// 관리자 권한 확인
		await this.checkUserIsAdmin(userId, id);

		const workspace = await this.workspaceRepository.findOne({
			where: { id, isActive: true, deleted: false },
			relations: ['invitationCodes'],
		});

		if (!workspace) {
			throw new AppException(ErrorCode.WORKSPACE_NOT_FOUND);
		}

		const invitationCodeId = workspace.invitationCodes.find((code) => code.isActive)?.id;

		if (invitationCodeId) {
			await this.deleteInvitationCode(invitationCodeId, userId);
		}

		workspace.isActive = false;
		workspace.deleted = true;
		await this.workspaceRepository.save(workspace);
	}

	/**
	 * 워크스페이스에 사용자 추가 (관리자 권한)
	 */
	async addUser(
		workspaceId: number,
		addUserDto: AddUserToWorkspaceDto,
		adminUserId: number,
	): Promise<void> {
		// 관리자 권한 확인
		await this.checkUserIsAdmin(adminUserId, workspaceId);

		// 추가하려는 사용자가 존재하는지 확인
		const userToAdd = await this.usersService.findOne(addUserDto.userId);
		if (!userToAdd) {
			throw new AppException(ErrorCode.USER_NOT_FOUND);
		}

		// 이미 워크스페이스에 속해있는지 확인
		const existingUser = await this.workspaceUserRepository.findOne({
			where: { workspaceId, userId: addUserDto.userId },
		});
		if (existingUser) {
			throw new AppException(ErrorCode.USER_ALREADY_EXISTS);
		}

		const workspaceUser = this.workspaceUserRepository.create({
			workspaceId,
			userId: addUserDto.userId,
			role: WorkspaceRole.MEMBER, // 기본값으로 MEMBER 설정
			department: addUserDto.department,
			position: addUserDto.position,
		});

		await this.workspaceUserRepository.save(workspaceUser);
	}

	/**
	 * 워크스페이스에서 사용자 제거 (관리자 권한)
	 */
	async removeUser(workspaceId: number, userId: number, adminUserId: number): Promise<void> {
		// 관리자 권한 확인하면서 관리자 정보도 가져옴
		const adminUser = await this.checkPermission(adminUserId, workspaceId, WorkspaceRole.ADMIN);

		const targetUser = await this.workspaceUserRepository.findOne({
			where: { workspaceId, userId },
		});

		if (!targetUser) {
			throw new AppException(ErrorCode.USER_NOT_FOUND);
		}

		// SUPER_ADMIN만 다른 ADMIN을 제거할 수 있음
		if (
			targetUser.role === WorkspaceRole.ADMIN &&
			adminUser.role !== WorkspaceRole.SUPER_ADMIN
		) {
			throw new AppException(ErrorCode.WORKSPACE_AUTHORIZATION_DENIED);
		}

		await this.workspaceUserRepository.remove(targetUser);
	}

	/**
	 * 워크스페이스 사용자 목록 조회
	 */
	async getWorkspaceUsers(workspaceId: number, userId: number): Promise<WorkspaceUser[]> {
		// 사용자가 워크스페이스에 속해있는지 확인
		await this.checkUserInWorkspace(userId, workspaceId);

		return this.workspaceUserRepository.find({
			where: { workspaceId },
			relations: ['user'],
		});
	}

	/**
	 * 초대 코드 생성
	 */
	async createInvitationCode(
		workspaceId: number,
		userId: number,
	): Promise<WorkspaceInvitationCode> {
		// 관리자 권한 확인
		await this.checkUserIsAdmin(userId, workspaceId);

		// 기존 활성 초대 코드 찾기
		const existingCodes = await this.invitationCodeRepository.find({
			where: { workspaceId, isActive: true },
		});

		// 기존 활성 초대 코드가 있으면 에러 반환
		if (existingCodes.length > 0) {
			throw new AppException(ErrorCode.ALEADY_EXIST_INVITATION_CODE);
		}

		const code = this.generateInvitationCode();
		const invitationCode = this.invitationCodeRepository.create({
			workspaceId,
			code,
		});

		return this.invitationCodeRepository.save(invitationCode);
	}

	/**
	 * 초대 코드 목록 조회
	 */
	async getInvitationCodes(
		workspaceId: number,
		userId: number,
	): Promise<WorkspaceInvitationCode | null> {
		// 관리자 권한 확인
		await this.checkUserIsAdmin(userId, workspaceId);

		const invitationCode = await this.invitationCodeRepository.findOne({
			where: { workspaceId, isActive: true },
		});

		return invitationCode;
	}

	/**
	 * 초대 코드 갱신(수정)
	 */
	async regenerateInvitationCode(
		workspaceId: number,
		userId: number,
	): Promise<WorkspaceInvitationCode> {
		// 관리자 권한 확인
		await this.checkUserIsAdmin(userId, workspaceId);

		// 기존 활성 초대 코드 찾기
		const existingCodes = await this.invitationCodeRepository.find({
			where: { workspaceId, isActive: true },
		});

		// 기존 코드 비활성화
		for (const code of existingCodes) {
			code.isActive = false;
			await this.invitationCodeRepository.save(code);
		}

		// 새 초대 코드 생성
		const newCode = this.generateInvitationCode();
		const invitationCode = this.invitationCodeRepository.create({
			workspaceId,
			code: newCode,
			isActive: true,
		});

		return this.invitationCodeRepository.save(invitationCode);
	}

	/**
	 * 초대 코드 생성
	 */
	private generateInvitationCode(): string {
		return crypto.randomBytes(8).toString('hex').toUpperCase();
	}

	/**
	 * 초대 코드 삭제 (비활성화)
	 */
	async deleteInvitationCode(codeId: number, userId: number): Promise<void> {
		const invitationCode = await this.invitationCodeRepository.findOne({
			where: { id: codeId, isActive: true },
		});

		if (!invitationCode) {
			throw new AppException(ErrorCode.INVALID_INVITATION_CODE);
		}

		// 관리자 권한 확인
		await this.checkUserIsAdmin(userId, invitationCode.workspaceId);

		invitationCode.isActive = false;
		await this.invitationCodeRepository.save(invitationCode);
	}

	/**
	 * 초대 코드 사용
	 */
	async useInvitationCode(
		useInvitationCodeDto: UseInvitationCodeDto,
		userId: number,
	): Promise<Workspace> {
		const invitationCode = await this.invitationCodeRepository.findOne({
			where: { code: useInvitationCodeDto.code, isActive: true },
			relations: ['workspace'],
		});

		if (!invitationCode) {
			throw new AppException(ErrorCode.INVALID_INVITATION_CODE);
		}

		// 이미 워크스페이스에 속해있는지 확인
		const existingUser = await this.workspaceUserRepository.findOne({
			where: { workspaceId: invitationCode.workspaceId, userId },
		});

		if (existingUser) {
			throw new AppException(ErrorCode.USER_ALREADY_EXISTS);
		}

		// 워크스페이스에 사용자 추가
		const workspaceUser = this.workspaceUserRepository.create({
			workspaceId: invitationCode.workspaceId,
			userId,
			role: WorkspaceRole.MEMBER, // 초대받은 사용자는 기본적으로 MEMBER
		});
		await this.workspaceUserRepository.save(workspaceUser);

		// 초대 히스토리 생성
		const invitationHistory = this.invitationHistoryRepository.create({
			workspaceId: invitationCode.workspaceId,
			invitationCodeId: invitationCode.id,
			emailSentTo: '', // 이메일 기능이 없으므로 빈 값
			createdByUserId: userId,
			usedAt: new Date(),
			usedByUserId: userId,
			status: InvitationStatus.USED,
		});
		await this.invitationHistoryRepository.save(invitationHistory);

		return invitationCode.workspace;
	}

	/**
	 * 사용자의 워크스페이스 정보 조회
	 */
	private async getUserWorkspace(
		userId: number,
		workspaceId: number,
	): Promise<WorkspaceUser | null> {
		return this.workspaceUserRepository.findOne({
			where: { userId, workspaceId },
		});
	}

	/**
	 * 역할 레벨 반환
	 */
	private getRoleLevel(role: WorkspaceRole): number {
		const levels = { MEMBER: 1, ADMIN: 2, SUPER_ADMIN: 3 };
		return levels[role] || 0;
	}

	/**
	 * 권한 확인 (통합 메서드)
	 */
	private async checkPermission(
		userId: number,
		workspaceId: number,
		requiredRole: WorkspaceRole,
	): Promise<WorkspaceUser> {
		const workspaceUser = await this.getUserWorkspace(userId, workspaceId);

		if (!workspaceUser) {
			throw new AppException(ErrorCode.WORKSPACE_ACCESS_DENIED);
		}

		const userLevel = this.getRoleLevel(workspaceUser.role);
		const requiredLevel = this.getRoleLevel(requiredRole);

		if (userLevel < requiredLevel) {
			throw new AppException(ErrorCode.WORKSPACE_AUTHORIZATION_DENIED);
		}

		return workspaceUser;
	}

	/**
	 * 사용자가 워크스페이스에 속해있는지 확인
	 */
	private async checkUserInWorkspace(userId: number, workspaceId: number): Promise<void> {
		await this.checkPermission(userId, workspaceId, WorkspaceRole.MEMBER);
	}

	/**
	 * 사용자가 ADMIN 이상 권한이 있는지 확인
	 */
	private async checkUserIsAdmin(userId: number, workspaceId: number): Promise<void> {
		await this.checkPermission(userId, workspaceId, WorkspaceRole.ADMIN);
	}

	/**
	 * 사용자가 SUPER_ADMIN 권한이 있는지 확인
	 */
	private async checkUserIsSuperAdmin(userId: number, workspaceId: number): Promise<void> {
		await this.checkPermission(userId, workspaceId, WorkspaceRole.SUPER_ADMIN);
	}

	/**
	 * 특정 역할 이상인지 확인 (public 메서드)
	 */
	async hasMinimumRole(
		userId: number,
		workspaceId: number,
		minimumRole: WorkspaceRole,
	): Promise<boolean> {
		try {
			await this.checkPermission(userId, workspaceId, minimumRole);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * 워크스페이스 내 자신의 정보 조회
	 */
	async getMyWorkspaceInfo(workspaceId: number, userId: number): Promise<WorkspaceUser> {
		const workspaceUser = await this.workspaceUserRepository.findOne({
			where: { workspaceId, userId },
			relations: ['user'],
		});
		if (!workspaceUser) {
			throw new AppException(ErrorCode.WORKSPACE_ACCESS_DENIED);
		}

		return workspaceUser;
	}

	/**
	 * 워크스페이스 내 자신의 정보 수정
	 */
	async updateMyWorkspaceInfo(
		workspaceId: number,
		userId: number,
		updateDto: UpdateWorkspaceUserDto,
	): Promise<void> {
		await this.checkUserInWorkspace(userId, workspaceId);

		const workspaceUser = await this.workspaceUserRepository.findOne({
			where: { workspaceId, userId },
		});

		if (!workspaceUser) {
			throw new AppException(ErrorCode.USER_NOT_FOUND);
		}

		if (updateDto.department !== undefined) {
			workspaceUser.department = updateDto.department;
		}
		if (updateDto.position !== undefined) {
			workspaceUser.position = updateDto.position;
		}

		await this.workspaceUserRepository.save(workspaceUser);
	}

	/**
	 * 워크스페이스 나가기 (본인만 가능, SUPER_ADMIN은 불가)
	 */
	async leaveWorkspace(workspaceId: number, userId: number): Promise<void> {
		await this.checkUserInWorkspace(userId, workspaceId);

		const workspaceUser = await this.workspaceUserRepository.findOne({
			where: { workspaceId, userId },
		});

		if (!workspaceUser) {
			throw new AppException(ErrorCode.USER_NOT_FOUND);
		}

		if (workspaceUser.role === WorkspaceRole.SUPER_ADMIN) {
			throw new AppException(ErrorCode.WORKSPACE_AUTHORIZATION_DENIED);
		}

		await this.workspaceUserRepository.remove(workspaceUser);
	}

	/**
	 * 워크스페이스 SUPER_ADMIN 역할 위임
	 */
	async transferSuperAdminRole(
		workspaceId: number,
		currentSuperAdminId: number,
		newSuperAdminId: number,
	): Promise<void> {
		// 1. 현재 요청자가 SUPER_ADMIN인지 확인
		await this.checkUserIsSuperAdmin(currentSuperAdminId, workspaceId);

		if (currentSuperAdminId === newSuperAdminId) {
			throw new AppException(ErrorCode.BAD_REQUEST);
		}

		// 2. 위임받을 사용자가 워크스페이스에 속해있는지 확인
		const newSuperAdminWorkspaceUser = await this.checkPermission(
			newSuperAdminId,
			workspaceId,
			WorkspaceRole.MEMBER, // 최소 MEMBER에게만 위임 가능하도록 설정
		);

		const currentSuperAdminWorkspaceUser = await this.workspaceUserRepository.findOneByOrFail({
			userId: currentSuperAdminId,
			workspaceId,
		});

		// 3. 트랜잭션 시작
		const queryRunner = this.workspaceRepository.manager.connection.createQueryRunner();
		await queryRunner.connect();
		await queryRunner.startTransaction();

		try {
			// 4. 현재 SUPER_ADMIN의 역할을 ADMIN으로 변경
			currentSuperAdminWorkspaceUser.role = WorkspaceRole.ADMIN;
			await queryRunner.manager.save(currentSuperAdminWorkspaceUser);

			// 5. 새로운 사용자의 역할을 SUPER_ADMIN으로 변경
			newSuperAdminWorkspaceUser.role = WorkspaceRole.SUPER_ADMIN;
			await queryRunner.manager.save(newSuperAdminWorkspaceUser);

			// 6. Workspace 엔티티의 superAdminName 업데이트
			const newSuperAdminUser = await queryRunner.manager.findOneByOrFail(User, {
				id: newSuperAdminId,
			});
			await queryRunner.manager.update(Workspace, workspaceId, {
				superAdminName: newSuperAdminUser.name,
			});

			await queryRunner.commitTransaction();
		} catch (error) {
			await queryRunner.rollbackTransaction();
			throw new AppException(ErrorCode.SERVER_ERROR);
		} finally {
			await queryRunner.release();
		}
	}

	/**
	 * 워크스페이스 사용자 역할 변경 (SUPER_ADMIN만 가능)
	 */
	async updateUserRole(
		workspaceId: number,
		targetUserId: number,
		requestingUserId: number,
		newRole: WorkspaceRole,
	): Promise<void> {
		// 1. 요청자가 SUPER_ADMIN인지 확인 (컨트롤러의 가드가 이미 처리하지만, 서비스 계층에서 명시적 확인)
		await this.checkUserIsSuperAdmin(requestingUserId, workspaceId);

		// 2. 자기 자신의 역할을 변경할 수 없음
		if (targetUserId === requestingUserId) {
			throw new AppException(ErrorCode.BAD_REQUEST);
		}

		// 3. SUPER_ADMIN으로의 역할 변경은 소유권 이전 기능을 통해서만 가능
		if (newRole === WorkspaceRole.SUPER_ADMIN) {
			throw new AppException(ErrorCode.BAD_REQUEST);
		}

		// 4. 대상 사용자를 찾고, 대상이 SUPER_ADMIN이 아닌지 확인
		const targetWorkspaceUser = await this.workspaceUserRepository.findOneByOrFail({
			workspaceId,
			userId: targetUserId,
		});

		//	'SUPER_ADMIN의 역할은 변경할 수 없습니다.',
		if (targetWorkspaceUser.role === WorkspaceRole.SUPER_ADMIN) {
			throw new AppException(ErrorCode.BAD_REQUEST);
		}

		// 5. 역할 업데이트 및 저장
		targetWorkspaceUser.role = newRole;
		await this.workspaceUserRepository.save(targetWorkspaceUser);
	}
}
