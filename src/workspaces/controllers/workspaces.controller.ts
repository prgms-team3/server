import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	ParseIntPipe,
	Patch,
	Post,
	Put,
	Query,
	Request,
	UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WorkspaceRoles } from '../../auth/decorators/workspace-role.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { WorkspaceRoleGuard } from '../../auth/guards/workspace-role.guard';
import { AuthenticatedRequest } from '../../types/authenticated-request';
import { AddUserToWorkspaceDto } from '../dto/add-user-to-workspace.dto';
import { CreateWorkspaceDto } from '../dto/create-workspace.dto';
import { UpdateWorkspaceDto } from '../dto/update-workspace.dto';
import { UseInvitationCodeDto } from '../dto/use-invitation-code.dto';
import { TransferSuperAdminDto } from '../dto/transfer-super-admin.dto';
import { UpdateWorkspaceUserRoleDto } from '../dto/update-workspace-user-role.dto';
import { WorkspaceQueryDto } from '../dto/workspace-query.dto';
import {
	findMyWorkspacesResponseDto,
	findUserWorkspacesResponseDto,
	WorkspaceCreateResponseDto,
} from '../dto/workspace-response.dto';
import { Workspace } from '../entities/workspace.entity';
import { WorkspaceInvitationCode } from '../entities/workspace-invitation-code.entity';
import { WorkspaceRole, WorkspaceUser } from '../entities/workspace-user.entity';
import { WorkspacesService } from '../services/workspaces.service';
import { UpdateWorkspaceUserDto } from '../dto/update-user-to-workspace.dto';

@ApiTags('Workspaces')
@ApiBearerAuth()
@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspacesController {
	constructor(private readonly workspacesService: WorkspacesService) {}

	@Post()
	@ApiOperation({ summary: '워크스페이스 생성' })
	@ApiResponse({
		status: 201,
		description: '워크스페이스가 성공적으로 생성되었습니다.',
		type: WorkspaceCreateResponseDto,
	})
	@ApiResponse({ status: 404, description: '사용자를 찾을 수 없습니다.' })
	@ApiResponse({ status: 409, description: '이미 존재하는 초대 코드입니다.' })
	@ApiResponse({ status: 403, description: '워크 스페이스에 접근할 권한이 없습니다.' })
	@ApiResponse({ status: 403, description: '워크스페이스 작업을 수행할 권한이 없습니다.' })
	@ApiResponse({ status: 400, description: '잘못된 요청입니다.' })
	async create(
		@Body() createWorkspaceDto: CreateWorkspaceDto,
		@Request() req: AuthenticatedRequest, // 👈 타입 명시
	): Promise<WorkspaceCreateResponseDto> {
		return this.workspacesService.create(createWorkspaceDto, req.user.sub);
	}

	@Get('my')
	@ApiOperation({ summary: '내가 속한 워크스페이스 목록 조회' })
	@ApiResponse({
		status: 200,
		description: '워크스페이스 목록이 성공적으로 조회되었습니다.',
		type: findUserWorkspacesResponseDto,
	})
	async findMyWorkspaces(
		@Query() query: WorkspaceQueryDto,
		@Request() req: any,
	): Promise<findUserWorkspacesResponseDto> {
		return this.workspacesService.findUserWorkspaces(query, req.user.sub);
	}

	@Get(':id')
	@ApiOperation({ summary: '워크스페이스 상세 조회' })
	@ApiParam({ name: 'id', description: '워크스페이스 ID' })
	@ApiResponse({
		status: 200,
		description: '워크스페이스 정보가 성공적으로 조회되었습니다.',
		type: Workspace,
	})
	@ApiResponse({ status: 404, description: '워크스페이스를 찾을 수 없습니다.' })
	@ApiResponse({ status: 403, description: '워크스페이스에 접근할 권한이 없습니다.' })
	async findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any): Promise<Workspace> {
		return this.workspacesService.findOne(id, req.user.sub);
	}

	@Patch(':id')
	@UseGuards(WorkspaceRoleGuard)
	@WorkspaceRoles(WorkspaceRole.ADMIN, WorkspaceRole.SUPER_ADMIN)
	@ApiOperation({ summary: '워크스페이스 정보 수정 (관리자 권한 이상 필요)' })
	@ApiParam({ name: 'id', description: '워크스페이스 ID' })
	@ApiResponse({
		status: 200,
		description: '워크스페이스 정보가 성공적으로 수정되었습니다.',
		type: WorkspaceCreateResponseDto,
	})
	@ApiResponse({ status: 404, description: '워크스페이스를 찾을 수 없습니다.' })
	@ApiResponse({ status: 403, description: '워크스페이스 관리자 권한이 없습니다.' })
	async update(
		@Param('id', ParseIntPipe) id: number,
		@Body() updateWorkspaceDto: UpdateWorkspaceDto,
		@Request() req: any,
	): Promise<WorkspaceCreateResponseDto> {
		return this.workspacesService.update(id, updateWorkspaceDto, req.user.sub);
	}

	@Patch(':id/deactivate')
	@UseGuards(WorkspaceRoleGuard)
	@WorkspaceRoles(WorkspaceRole.ADMIN, WorkspaceRole.SUPER_ADMIN)
	@ApiOperation({ summary: '워크스페이스 비활성화 (관리자 권한 이상 필요)' })
	@ApiParam({ name: 'id', description: '워크스페이스 ID' })
	@ApiResponse({ status: 200, description: '워크스페이스가 성공적으로 비활성화되었습니다.' })
	@ApiResponse({ status: 404, description: '워크스페이스를 찾을 수 없습니다.' })
	@ApiResponse({ status: 403, description: '워크스페이스 관리자 권한이 없습니다.' })
	async deActivate(@Param('id', ParseIntPipe) id: number, @Request() req: any): Promise<void> {
		return this.workspacesService.deActivate(id, req.user.sub);
	}

	@Patch(':id/activate')
	@UseGuards(WorkspaceRoleGuard)
	@WorkspaceRoles(WorkspaceRole.ADMIN, WorkspaceRole.SUPER_ADMIN)
	@ApiOperation({ summary: '워크스페이스 활성화 (관리자 권한 이상 필요)' })
	@ApiParam({ name: 'id', description: '워크스페이스 ID' })
	@ApiResponse({ status: 200, description: '워크스페이스가 성공적으로 활성화되었습니다.' })
	@ApiResponse({ status: 404, description: '워크스페이스를 찾을 수 없습니다.' })
	@ApiResponse({ status: 403, description: '워크스페이스 관리자 권한이 없습니다.' })
	async activate(@Param('id', ParseIntPipe) id: number, @Request() req: any): Promise<void> {
		return this.workspacesService.activate(id, req.user.sub);
	}

	@Delete(':id')
	@UseGuards(WorkspaceRoleGuard)
	@WorkspaceRoles(WorkspaceRole.SUPER_ADMIN) // 삭제는 SUPER_ADMIN만
	@ApiOperation({ summary: '워크스페이스 삭제 (슈퍼관리자 권한 필요)' })
	@ApiParam({ name: 'id', description: '워크스페이스 ID' })
	@ApiResponse({ status: 200, description: '워크스페이스가 성공적으로 삭제되었습니다.' })
	@ApiResponse({ status: 404, description: '워크스페이스를 찾을 수 없습니다.' })
	@ApiResponse({ status: 403, description: '워크스페이스 관리자 권한이 없습니다.' })
	async remove(@Param('id', ParseIntPipe) id: number, @Request() req: any): Promise<void> {
		return this.workspacesService.remove(id, req.user.sub);
	}

	@Patch(':id/transfer-super-admin')
	@UseGuards(WorkspaceRoleGuard)
	@WorkspaceRoles(WorkspaceRole.SUPER_ADMIN)
	@ApiOperation({ summary: '워크스페이스 SUPER_ADMIN 권한 이전 (슈퍼관리자 권한 필요)' })
	@ApiParam({ name: 'id', description: '워크스페이스 ID' })
	@ApiResponse({
		status: 200,
		description: '워크스페이스 SUPER_ADMIN 권한이 성공적으로 이전되었습니다.',
	})
	@ApiResponse({
		status: 403,
		description: '워크스페이스 SUPER_ADMIN 권한 이전 권한이 없습니다.',
	})
	@ApiResponse({ status: 404, description: '워크스페이스 또는 사용자를 찾을 수 없습니다.' })
	@ApiResponse({
		status: 400,
		description: '잘못된 요청입니다. (예: 자신에게 위임 시도)',
	})
	async transferSuperAdminRole(
		@Param('id', ParseIntPipe) id: number,
		@Body() transferSuperAdminDto: TransferSuperAdminDto,
		@Request() req: AuthenticatedRequest,
	): Promise<void> {
		return this.workspacesService.transferSuperAdminRole(
			id,
			req.user.sub,
			transferSuperAdminDto.newSuperAdminId,
		);
	}

	@Get(':id/users')
	@UseGuards(WorkspaceRoleGuard)
	@WorkspaceRoles(WorkspaceRole.MEMBER, WorkspaceRole.ADMIN)
	@ApiOperation({ summary: '워크스페이스 사용자 목록 조회 (멤버 이상)' })
	@ApiParam({ name: 'id', description: '워크스페이스 ID' })
	@ApiResponse({
		status: 200,
		description: '워크스페이스 사용자 목록이 성공적으로 조회되었습니다.',
		type: [WorkspaceUser],
	})
	@ApiResponse({ status: 403, description: '워크스페이스에 접근할 권한이 없습니다.' })
	async getWorkspaceUsers(
		@Param('id', ParseIntPipe) id: number,
		@Request() req: any,
	): Promise<WorkspaceUser[]> {
		return this.workspacesService.getWorkspaceUsers(id, req.user.sub);
	}

	@Post(':id/users')
	@UseGuards(WorkspaceRoleGuard)
	@WorkspaceRoles(WorkspaceRole.ADMIN, WorkspaceRole.SUPER_ADMIN)
	@ApiOperation({ summary: '워크스페이스에 사용자 추가 (관리자 권한 이상 필요)' })
	@ApiParam({ name: 'id', description: '워크스페이스 ID' })
	@ApiResponse({ status: 201, description: '사용자가 성공적으로 추가되었습니다.' })
	@ApiResponse({ status: 403, description: '워크스페이스 관리자 권한이 없습니다.' })
	@ApiResponse({ status: 409, description: '이미 존재하는 사용자입니다.' })
	async addUser(
		@Param('id', ParseIntPipe) id: number,
		@Body() addUserDto: AddUserToWorkspaceDto,
		@Request() req: any,
	): Promise<void> {
		return this.workspacesService.addUser(id, addUserDto, req.user.sub);
	}

	@Delete(':id/users/:userId')
	@UseGuards(WorkspaceRoleGuard)
	@WorkspaceRoles(WorkspaceRole.ADMIN, WorkspaceRole.SUPER_ADMIN)
	@ApiOperation({ summary: '워크스페이스에서 사용자 제거 (관리자 권한 이상 필요)' })
	@ApiParam({ name: 'id', description: '워크스페이스 ID' })
	@ApiParam({ name: 'userId', description: '제거할 사용자 ID' })
	@ApiResponse({ status: 200, description: '사용자가 성공적으로 제거되었습니다.' })
	@ApiResponse({ status: 403, description: '워크스페이스 관리자 권한이 없습니다.' })
	@ApiResponse({ status: 404, description: '사용자를 찾을 수 없습니다.' })
	async removeUser(
		@Param('id', ParseIntPipe) id: number,
		@Param('userId', ParseIntPipe) userId: number,
		@Request() req: any,
	): Promise<void> {
		return this.workspacesService.removeUser(id, userId, req.user.sub);
	}

	@Patch(':id/users/role')
	@UseGuards(WorkspaceRoleGuard)
	@WorkspaceRoles(WorkspaceRole.ADMIN, WorkspaceRole.SUPER_ADMIN)
	@ApiOperation({ summary: '워크스페이스 사용자 역할 변경 (관리자 이상 권한 필요)' })
	@ApiParam({ name: 'id', description: '워크스페이스 ID' })
	@ApiResponse({ status: 200, description: '사용자 역할이 성공적으로 변경되었습니다.' })
	@ApiResponse({ status: 403, description: '워크스페이스 관리자 권한이 없습니다.' })
	@ApiResponse({ status: 404, description: '워크스페이스 또는 사용자를 찾을 수 없습니다.' })
	@ApiResponse({
		status: 400,
		description: '잘못된 요청입니다. (예: 권한 없는 역할 변경 시도, 자신 역할 변경 시도 등)',
	})
	async updateUserRole(
		@Param('id', ParseIntPipe) id: number,
		@Body() updateWorkspaceUserRoleDto: UpdateWorkspaceUserRoleDto,
		@Request() req: AuthenticatedRequest,
	): Promise<void> {
		return this.workspacesService.updateUserRole(
			id,
			updateWorkspaceUserRoleDto.userId,
			req.user.sub,
			updateWorkspaceUserRoleDto.role,
		);
	}

	@Post(':id/invitation-codes')
	@UseGuards(WorkspaceRoleGuard)
	@WorkspaceRoles(WorkspaceRole.ADMIN, WorkspaceRole.SUPER_ADMIN)
	@ApiOperation({ summary: '초대 코드 생성 (관리자 권한 이상 필요)' })
	@ApiParam({ name: 'id', description: '워크스페이스 ID' })
	@ApiResponse({
		status: 201,
		description: '초대 코드가 성공적으로 생성되었습니다.',
		type: WorkspaceInvitationCode,
	})
	@ApiResponse({ status: 403, description: '워크스페이스 관리자 권한이 없습니다.' })
	@ApiResponse({ status: 409, description: '이미 존재하는 초대 코드입니다.' })
	async createInvitationCode(
		@Param('id', ParseIntPipe) id: number,
		@Request() req: any,
	): Promise<WorkspaceInvitationCode> {
		return this.workspacesService.createInvitationCode(id, req.user.sub);
	}

	@Get(':id/invitation-codes')
	@UseGuards(WorkspaceRoleGuard)
	@WorkspaceRoles(WorkspaceRole.ADMIN, WorkspaceRole.SUPER_ADMIN)
	@ApiOperation({ summary: '초대 코드 목록 조회 (관리자 권한 이상 필요)' })
	@ApiParam({ name: 'id', description: '워크스페이스 ID' })
	@ApiResponse({
		status: 200,
		description: '초대 코드 목록이 성공적으로 조회되었습니다.',
		type: [WorkspaceInvitationCode],
	})
	@ApiResponse({ status: 403, description: '워크스페이스 관리자 권한이 없습니다.' })
	async getInvitationCodes(
		@Param('id', ParseIntPipe) id: number,
		@Request() req: any,
	): Promise<WorkspaceInvitationCode | null> {
		return this.workspacesService.getInvitationCodes(id, req.user.sub);
	}

	@Put(':id/invitation-codes')
	@UseGuards(WorkspaceRoleGuard)
	@WorkspaceRoles(WorkspaceRole.ADMIN, WorkspaceRole.SUPER_ADMIN)
	@ApiOperation({ summary: '초대 코드 갱신 (관리자 권한 필요)' })
	@ApiParam({ name: 'id', description: '워크스페이스 ID' })
	@ApiResponse({ status: 200, description: '초대 코드가 성공적으로 갱신되었습니다.' })
	@ApiResponse({ status: 403, description: '워크스페이스 관리자 권한이 없습니다.' })
	async regenerateInvitationCode(
		@Param('id', ParseIntPipe) id: number,
		@Request() req: any,
	): Promise<WorkspaceInvitationCode> {
		return this.workspacesService.regenerateInvitationCode(id, req.user.sub);
	}

	@Delete('invitation-codes/:codeId')
	@UseGuards(WorkspaceRoleGuard)
	@WorkspaceRoles(WorkspaceRole.ADMIN, WorkspaceRole.SUPER_ADMIN)
	@ApiOperation({ summary: '초대 코드 삭제 (관리자 권한 필요)' })
	@ApiParam({ name: 'codeId', description: '초대 코드 ID' })
	@ApiResponse({ status: 200, description: '초대 코드가 성공적으로 삭제되었습니다.' })
	@ApiResponse({ status: 403, description: '워크스페이스 관리자 권한이 없습니다.' })
	@ApiResponse({ status: 400, description: '유효하지 않은 초대 코드입니다.' })
	async deleteInvitationCode(
		@Param('codeId', ParseIntPipe) codeId: number,
		@Request() req: any,
	): Promise<void> {
		return this.workspacesService.deleteInvitationCode(codeId, req.user.sub);
	}

	@Get(':id/me')
	@ApiOperation({ summary: '내 정보 조회' })
	@ApiParam({ name: 'id', description: '워크스페이스 ID' })
	@ApiResponse({
		status: 200,
		description: '내 정보가 성공적으로 조회되었습니다.',
		type: WorkspaceUser,
	})
	@ApiResponse({ status: 403, description: '워크스페이스 권한이 없습니다.' })
	async getMyInfo(
		@Param('id', ParseIntPipe) id: number,
		@Request() req: any,
	): Promise<WorkspaceUser | null> {
		return this.workspacesService.getMyWorkspaceInfo(id, req.user.sub);
	}

	@Patch(':id/me/')
	@ApiOperation({ summary: '내 워크스페이스 정보 수정' })
	@ApiParam({ name: 'id', description: '워크스페이스 ID' })
	@ApiResponse({ status: 200, description: '내 정보가 성공적으로 수정되었습니다.' })
	@ApiResponse({ status: 403, description: '워크스페이스 권한이 없습니다.' })
	@ApiResponse({ status: 404, description: '사용자를 찾을 수 없습니다.' })
	async updateMyInfo(
		@Param('id', ParseIntPipe) id: number,
		@Body() updateWorkspaceUserDto: UpdateWorkspaceUserDto,
		@Request() req: AuthenticatedRequest,
	): Promise<void> {
		return this.workspacesService.updateMyWorkspaceInfo(
			id,
			req.user.sub,
			updateWorkspaceUserDto,
		);
	}

	@Delete(':id/leave')
	@ApiOperation({ summary: '워크스페이스 나가기' })
	@ApiParam({ name: 'id', description: '워크스페이스 ID' })
	@ApiResponse({ status: 200, description: '워크스페이스에서 성공적으로 나갔습니다.' })
	@ApiResponse({
		status: 403,
		description: '워크스페이스 소유자(SUPER_ADMIN)는 나갈 수 없습니다.',
	})
	@ApiResponse({ status: 404, description: '워크스페이스 또는 사용자를 찾을 수 없습니다.' })
	async leaveWorkspace(
		@Param('id', ParseIntPipe) id: number,
		@Request() req: AuthenticatedRequest,
	): Promise<void> {
		return this.workspacesService.leaveWorkspace(id, req.user.sub);
	}

	@Post('join')
	@ApiOperation({ summary: '초대 코드로 워크스페이스 참여' })
	@ApiResponse({
		status: 201,
		description: '워크스페이스에 성공적으로 참여했습니다.',
		type: Workspace,
	})
	@ApiResponse({ status: 400, description: '유효하지 않은 초대 코드입니다.' })
	@ApiResponse({ status: 409, description: '이미 존재하는 사용자입니다.' })
	async useInvitationCode(
		@Body() useInvitationCodeDto: UseInvitationCodeDto,
		@Request() req: any,
	): Promise<Workspace> {
		return this.workspacesService.useInvitationCode(useInvitationCodeDto, req.user.sub);
	}
}
