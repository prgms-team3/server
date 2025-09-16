import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	ParseIntPipe,
	Patch,
	Post,
	Req,
	UseGuards,
	UsePipes,
	ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { CreateGroupDto } from '../dto/create-group.dto';
import { UpdateGroupDto } from '../dto/update-group.dto';
import { Group } from '../entities/group.entity';
import { GroupRole, GroupUser } from '../entities/group-user.entity';
import { GroupsService } from '../services/groups.service';
import { WorkspaceRoles } from '../../auth/decorators/workspace-role.decorator';
import { WorkspaceRole } from '../../workspaces/entities/workspace-user.entity';
import { WorkspaceRoleGuard } from '../../auth/guards/workspace-role.guard';

@ApiTags('Groups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ transform: true }))
@Controller('groups')
export class GroupsController {
	constructor(private readonly groupsService: GroupsService) {}

	@Post()
	@UseGuards(WorkspaceRoleGuard)
	@WorkspaceRoles(WorkspaceRole.ADMIN, WorkspaceRole.SUPER_ADMIN)
	@ApiOperation({ summary: '그룹 생성 (관리자)' })
	@ApiResponse({
		status: 201,
		description: '그룹이 성공적으로 생성됨',
		type: Group,
	})
	@ApiResponse({ status: 400, description: '잘못된 요청 데이터입니다.' })
	@ApiResponse({ status: 401, description: '사용자 인증 실패' })
	@ApiResponse({ status: 403, description: '워크스페이스 관리자 권한이 없습니다.' })
	async create(@Body() createGroupDto: CreateGroupDto, @Req() req: AuthenticatedRequest) {
		return this.groupsService.create(createGroupDto, req.user.sub);
	}

	@Get()
	@ApiOperation({ summary: '모든 그룹 조회 (디버그용)' })
	@ApiResponse({ status: 200, description: '그룹 목록', type: [Group] })
	findAll(): Promise<Group[]> {
		return this.groupsService.findAll();
	}

	@Get('workspace/:workspaceId')
	@ApiOperation({ summary: '특정 워크스페이스의 그룹 조회 (모두)' })
	@ApiParam({
		name: 'workspaceId',
		description: '조회할 워크스페이스의 고유 ID',
	})
	@ApiResponse({ status: 200, description: '그룹 목록', type: [Group] })
	@ApiResponse({ status: 404, description: '워크스페이스를 찾을 수 없음' })
	findByWorkspace(
		@Param('workspaceId', ParseIntPipe) workspaceId: number,
		@Req() req: AuthenticatedRequest,
	): Promise<Group[]> {
		return this.groupsService.findByWorkspace(workspaceId, req.user.sub);
	}

	// 정적 라우트를 동적 라우트보다 먼저 선언
	@Get('deleted')
	@UseGuards(WorkspaceRoleGuard)
	@WorkspaceRoles(WorkspaceRole.ADMIN, WorkspaceRole.SUPER_ADMIN)
	@ApiOperation({ summary: '삭제된 그룹 목록 조회 (관리자)' })
	@ApiResponse({ status: 200, description: '삭제된 그룹 목록', type: [Group] })
	@ApiResponse({ status: 403, description: '워크스페이스 관리자 권한이 없습니다.' })
	findDeleted(): Promise<Group[]> {
		return this.groupsService.findDeleted();
	}

	@Get(':groupId')
	@ApiOperation({ summary: '그룹 상세 조회 (모두)' })
	@ApiParam({
		name: 'groupId',
		description: '조회할 그룹의 고유 ID',
		schema: { type: 'integer', minimum: 1 },
	})
	@ApiResponse({ status: 200, description: '그룹 상세 정보', type: Group })
	findOne(@Param('groupId', ParseIntPipe) groupId: number): Promise<Group> {
		return this.groupsService.findOne(groupId);
	}

	@Patch(':groupId')
	@UseGuards(WorkspaceRoleGuard)
	@WorkspaceRoles(WorkspaceRole.ADMIN, WorkspaceRole.SUPER_ADMIN)
	@ApiOperation({ summary: '그룹 수정 (관리자)' })
	@ApiParam({
		name: 'groupId',
		description: '수정할 그룹의 고유 ID',
		schema: { type: 'integer', minimum: 1 },
	})
	@ApiResponse({
		status: 200,
		description: '그룹이 성공적으로 수정됨',
		type: Group,
	})
	@ApiResponse({ status: 403, description: '워크스페이스 관리자 권한이 없습니다.' })
	update(
		@Param('groupId', ParseIntPipe) groupId: number,
		@Body() updateGroupDto: UpdateGroupDto,
		@Req() req: AuthenticatedRequest,
	): Promise<Group> {
		return this.groupsService.update(groupId, updateGroupDto, req.user.sub);
	}

	@Delete(':groupId')
	@UseGuards(WorkspaceRoleGuard)
	@WorkspaceRoles(WorkspaceRole.ADMIN, WorkspaceRole.SUPER_ADMIN)
	@ApiOperation({ summary: '그룹 삭제 (관리자)' })
	@ApiParam({
		name: 'groupId',
		description: '삭제할 그룹의 고유 ID',
		schema: { type: 'string' },
	})
	@ApiResponse({ status: 200, description: '그룹이 성공적으로 삭제됨' })
	@ApiResponse({ status: 403, description: '워크스페이스 관리자 권한이 없습니다.' })
	remove(@Param('groupId') groupId: string, @Req() req: AuthenticatedRequest): Promise<void> {
		return this.groupsService.remove(+groupId, req.user.sub);
	}

	// 멤버 관련 엔드포인트들
	@Post(':groupId/join')
	@ApiOperation({ summary: '그룹 가입 (본인)' })
	@ApiParam({
		name: 'groupId',
		description: '가입할 그룹의 고유 ID',
		schema: { type: 'integer', minimum: 1 },
	})
	@ApiResponse({
		status: 201,
		description: '그룹에 성공적으로 가입됨',
		type: GroupUser,
	})
	@ApiResponse({ status: 400, description: '이미 가입된 멤버이거나 잘못된 요청' })
	@ApiResponse({ status: 403, description: '가입 권한 없음 (비공개 그룹 등)' })
	@ApiResponse({ status: 404, description: '그룹을 찾을 수 없음' })
	joinGroup(
		@Param('groupId', ParseIntPipe) groupId: number,
		@Req() req: AuthenticatedRequest,
	): Promise<GroupUser> {
		return this.groupsService.joinGroup(groupId, req.user.sub);
	}

	@Delete(':groupId/leave')
	@ApiOperation({ summary: '그룹 탈퇴 (본인)' })
	@ApiParam({
		name: 'groupId',
		description: '탈퇴할 그룹의 고유 ID',
		schema: { type: 'integer', minimum: 1 },
	})
	@ApiResponse({ status: 200, description: '그룹에서 성공적으로 탈퇴됨' })
	@ApiResponse({ status: 400, description: '그룹 멤버가 아님' })
	@ApiResponse({ status: 404, description: '그룹을 찾을 수 없음' })
	@ApiResponse({ status: 409, description: '그룹 소유자는 탈퇴할 수 없음' })
	leaveGroup(
		@Param('groupId', ParseIntPipe) groupId: number,
		@Req() req: AuthenticatedRequest,
	): Promise<void> {
		return this.groupsService.leaveGroup(groupId, req.user.sub);
	}

	@Get(':groupId/members')
	@ApiOperation({ summary: '그룹 멤버 목록 조회 (모두)' })
	@ApiParam({
		name: 'groupId',
		description: '멤버 목록을 조회할 그룹의 고유 ID',
		schema: { type: 'integer', minimum: 1 },
	})
	@ApiResponse({ status: 200, description: '그룹 멤버 목록', type: [GroupUser] })
	@ApiResponse({ status: 404, description: '그룹을 찾을 수 없음' })
	getMembers(@Param('groupId', ParseIntPipe) groupId: number): Promise<GroupUser[]> {
		return this.groupsService.getMembers(groupId);
	}

	@Patch(':groupId/members/:userId/promote')
	@ApiOperation({
		summary: '멤버를 관리자로 승진  (미사용)',
		description: '그룹 관리자가 일반 멤버를 관리자로 승진시킵니다.',
	})
	@ApiParam({
		name: 'groupId',
		description: '그룹 ID',
		schema: { type: 'integer', minimum: 1 },
	})
	@ApiParam({
		name: 'userId',
		description: '승진시킬 멤버의 사용자 ID',
		schema: { type: 'integer', minimum: 1 },
	})
	@ApiResponse({
		status: 200,
		description: '멤버가 성공적으로 관리자로 승진됨',
		type: GroupUser,
	})
	@ApiResponse({ status: 400, description: '이미 관리자이거나 자신을 승진시킬 수 없음' })
	@ApiResponse({ status: 403, description: '권한 없음 (관리자 권한 필요)' })
	@ApiResponse({ status: 404, description: '그룹 또는 멤버를 찾을 수 없음' })
	promoteToAdmin(
		@Param('groupId', ParseIntPipe) groupId: number,
		@Param('userId', ParseIntPipe) userId: number,
		@Req() req: AuthenticatedRequest,
	): Promise<GroupUser> {
		return this.groupsService.changeRole(groupId, userId, GroupRole.ADMIN, req.user.sub);
	}

	@Patch(':groupId/members/:userId/demote')
	@ApiOperation({
		summary: '관리자를 일반 멤버로 강등 (미사용)',
		description: '그룹 관리자가 다른 관리자를 일반 멤버로 강등시킵니다.',
	})
	@ApiParam({
		name: 'groupId',
		description: '그룹 ID',
		schema: { type: 'integer', minimum: 1 },
	})
	@ApiParam({
		name: 'userId',
		description: '강등시킬 관리자의 사용자 ID',
		schema: { type: 'integer', minimum: 1 },
	})
	@ApiResponse({
		status: 200,
		description: '관리자가 성공적으로 일반 멤버로 강등됨',
		type: GroupUser,
	})
	@ApiResponse({ status: 400, description: '이미 일반 멤버이거나 자신을 강등시킬 수 없음' })
	@ApiResponse({ status: 403, description: '권한 없음 (관리자 권한 필요)' })
	@ApiResponse({ status: 404, description: '그룹 또는 멤버를 찾을 수 없음' })
	demoteToMember(
		@Param('groupId', ParseIntPipe) groupId: number,
		@Param('userId', ParseIntPipe) userId: number,
		@Req() req: AuthenticatedRequest,
	): Promise<GroupUser> {
		return this.groupsService.changeRole(groupId, userId, GroupRole.MEMBER, req.user.sub);
	}

	@Post(':groupId/members/:userId')
	@UseGuards(WorkspaceRoleGuard)
	@WorkspaceRoles(WorkspaceRole.ADMIN, WorkspaceRole.SUPER_ADMIN)
	@ApiOperation({
		summary: '관리자가 멤버를 그룹에 추가',
		description: '그룹 관리자가 특정 사용자를 그룹에 추가합니다.',
	})
	@ApiParam({
		name: 'groupId',
		description: '그룹의 고유 ID',
		schema: { type: 'integer', minimum: 1 },
	})
	@ApiParam({
		name: 'userId',
		description: '추가할 사용자의 ID',
		schema: { type: 'integer', minimum: 1 },
	})
	@ApiResponse({
		status: 201,
		description: '멤버가 성공적으로 그룹에 추가됨',
		type: GroupUser,
	})
	@ApiResponse({ status: 400, description: '이미 그룹 멤버이거나 잘못된 요청' })
	@ApiResponse({ status: 403, description: '워크스페이스 관리자 권한이 없습니다.' })
	@ApiResponse({ status: 404, description: '그룹 또는 사용자를 찾을 수 없음' })
	addMember(
		@Param('groupId', ParseIntPipe) groupId: number,
		@Param('userId', ParseIntPipe) userId: number,
		@Req() req: AuthenticatedRequest,
	): Promise<GroupUser> {
		return this.groupsService.addMember(groupId, userId, req.user.sub);
	}

	@Delete(':groupId/members/:userId')
	@UseGuards(WorkspaceRoleGuard)
	@WorkspaceRoles(WorkspaceRole.ADMIN, WorkspaceRole.SUPER_ADMIN)
	@ApiOperation({
		summary: '관리자가 멤버를 그룹에서 제거 (관리자)',
		description: '그룹 관리자가 특정 멤버를 그룹에서 제거합니다.',
	})
	@ApiParam({
		name: 'groupId',
		description: '그룹의 고유 ID',
		schema: { type: 'integer', minimum: 1 },
	})
	@ApiParam({
		name: 'userId',
		description: '제거할 멤버의 사용자 ID',
		schema: { type: 'integer', minimum: 1 },
	})
	@ApiResponse({ status: 200, description: '멤버가 성공적으로 그룹에서 제거됨' })
	@ApiResponse({ status: 400, description: '자신을 제거할 수 없음' })
	@ApiResponse({ status: 403, description: '워크스페이스 관리자 권한이 없습니다.' })
	@ApiResponse({ status: 404, description: '그룹 또는 멤버를 찾을 수 없음' })
	removeMember(
		@Param('groupId', ParseIntPipe) groupId: number,
		@Param('userId', ParseIntPipe) userId: number,
		@Req() req: AuthenticatedRequest,
	): Promise<void> {
		return this.groupsService.removeMember(groupId, userId, req.user.sub);
	}
}
