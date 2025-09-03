import * as crypto from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrorCode } from '../../common/constants/error-codes';
import { AppException } from '../../common/exceptions/app.exception';
import { AddUserToWorkspaceDto } from '../dto/add-user-to-workspace.dto';
import { CreateWorkspaceDto } from '../dto/create-workspace.dto';
import { UpdateWorkspaceDto } from '../dto/update-workspace.dto';
import { UseInvitationCodeDto } from '../dto/use-invitation-code.dto';
import { InvitationHistory, InvitationStatus } from '../entities/invitation-history.entity';
import { Workspace } from '../entities/workspace.entity';
import { WorkspaceInvitationCode } from '../entities/workspace-invitation-code.entity';
import { WorkspaceRole, WorkspaceUser } from '../entities/workspace-user.entity';

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
	) {}

	/**
	 * 워크스페이스 생성
	 */
	async create(createWorkspaceDto: CreateWorkspaceDto, userId: number): Promise<Workspace> {
		// 워크스페이스 생성
		const workspace = this.workspaceRepository.create(createWorkspaceDto);
		const savedWorkspace = await this.workspaceRepository.save(workspace);

		// 생성자를 ADMIN로 추가
		const workspaceUser = this.workspaceUserRepository.create({
			workspaceId: savedWorkspace.id,
			userId,
			role: WorkspaceRole.ADMIN,
		});
		await this.workspaceUserRepository.save(workspaceUser);

		return savedWorkspace;
	}

	/**
	 * 워크스페이스 목록 조회 (사용자가 속한)
	 */
	async findUserWorkspaces(userId: number): Promise<Workspace[]> {
		const workspaceUsers = await this.workspaceUserRepository.find({
			where: { userId },
			relations: ['workspace'],
		});

		return workspaceUsers.map((wu) => wu.workspace).filter((w) => w.isActive);
	}

	/**
	 * 워크스페이스 상세 조회
	 */
	async findOne(id: number, userId: number): Promise<Workspace> {
		// 사용자가 워크스페이스에 속해있는지 확인
		await this.checkUserInWorkspace(userId, id);

		const workspace = await this.workspaceRepository.findOne({
			where: { id, isActive: true },
			relations: ['workspaceUsers', 'workspaceUsers.user'],
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
	): Promise<Workspace> {
		// 관리자 권한 확인
		await this.checkUserIsAdmin(userId, id);

		const workspace = await this.workspaceRepository.findOne({
			where: { id, isActive: true },
		});

		if (!workspace) {
			throw new AppException(ErrorCode.WORKSPACE_NOT_FOUND);
		}

		Object.assign(workspace, updateWorkspaceDto);
		return this.workspaceRepository.save(workspace);
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
			where: { id },
		});

		if (!workspace) {
			throw new AppException(ErrorCode.WORKSPACE_NOT_FOUND);
		}

		workspace.deleted = true;
		await this.workspaceRepository.save(workspace);
	}

	/**
	 * 워크스페이스에 사용자 추가
	 */
	async addUser(
		workspaceId: number,
		addUserDto: AddUserToWorkspaceDto,
		adminUserId: number,
	): Promise<void> {
		// 관리자 권한 확인
		await this.checkUserIsAdmin(adminUserId, workspaceId);

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
		});

		await this.workspaceUserRepository.save(workspaceUser);
	}

	/**
	 * 워크스페이스에서 사용자 제거
	 */
	async removeUser(workspaceId: number, userId: number, adminUserId: number): Promise<void> {
		// 관리자 권한 확인
		await this.checkUserIsAdmin(adminUserId, workspaceId);

		const workspaceUser = await this.workspaceUserRepository.findOne({
			where: { workspaceId, userId },
		});

		if (!workspaceUser) {
			throw new AppException(ErrorCode.USER_NOT_FOUND);
		}

		await this.workspaceUserRepository.remove(workspaceUser);
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
	): Promise<WorkspaceInvitationCode[]> {
		// 관리자 권한 확인
		await this.checkUserIsAdmin(userId, workspaceId);

		return this.invitationCodeRepository.find({
			where: { workspaceId, isActive: true },
			order: { createdAt: 'DESC' },
		});
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
	 * 사용자가 워크스페이스에 속해있는지 확인
	 */
	private async checkUserInWorkspace(userId: number, workspaceId: number): Promise<void> {
		const workspaceUser = await this.workspaceUserRepository.findOne({
			where: { userId, workspaceId },
		});

		if (!workspaceUser) {
			throw new AppException(ErrorCode.WORKSPACE_ACCESS_DENIED);
		}
	}

	/**
	 * 특정 역할 이상인지 확인
	 */
	async hasMinimumRole(
		userId: number,
		workspaceId: number,
		minimumRole: WorkspaceRole,
	): Promise<boolean> {
		const userRole = await this.getUserRole(userId, workspaceId);
		if (!userRole) return false;

		const roleHierarchy = {
			[WorkspaceRole.MEMBER]: 0,
			[WorkspaceRole.ADMIN]: 1,
		};

		return roleHierarchy[userRole] >= roleHierarchy[minimumRole];
	}

	/**
	 * 사용자가 ADMIN 권한이 있는지 확인
	 */
	private async checkUserIsAdmin(userId: number, workspaceId: number): Promise<void> {
		const hasPermission = await this.hasMinimumRole(userId, workspaceId, WorkspaceRole.ADMIN);
		if (!hasPermission) {
			throw new AppException(ErrorCode.WORKSPACE_AUTHORIZATION_DENIED);
		}
	}

	/**
	 * 초대 코드 생성
	 */
	private generateInvitationCode(): string {
		return crypto.randomBytes(8).toString('hex').toUpperCase();
	}

	/**
	 * 사용자 역할 확인 헬퍼 메서드
	 */
	async getUserRole(userId: number, workspaceId: number): Promise<WorkspaceRole | null> {
		const workspaceUser = await this.workspaceUserRepository.findOne({
			where: { userId, workspaceId },
		});
		return workspaceUser?.role || null;
	}
}
