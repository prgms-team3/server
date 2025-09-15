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
import { AuthenticatedRequest } from '../../types/authenticated-request';
import { CreateGroupDto } from '../dto/create-group.dto';
import { UpdateGroupDto } from '../dto/update-group.dto';
import { Group } from '../entities/group.entity';
import { GroupRole, GroupUser } from '../entities/group-user.entity';
import { GroupsService } from '../services/groups.service';

@ApiTags('Groups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ transform: true }))
@Controller('groups')
export class GroupsController {
	constructor(private readonly groupsService: GroupsService) {}

	@Post()
	@ApiOperation({ summary: '그룹 생성' })
	@ApiResponse({
		status: 201,
		description: '그룹이 성공적으로 생성됨',
		type: Group,
	})
	@ApiResponse({ status: 400, description: '잘못된 요청 데이터' })
	@ApiResponse({ status: 403, description: '워크스페이스 멤버가 아님' })
	@ApiResponse({ status: 401, description: '인증 실패' })
	async create(@Body() createGroupDto: CreateGroupDto, @Req() req: AuthenticatedRequest) {
		return this.groupsService.create(createGroupDto, req.user.sub);
	}

	@Get()
	@ApiOperation({ summary: '모든 그룹 조회' })
	@ApiResponse({ status: 200, description: '그룹 목록', type: [Group] })
	findAll(): Promise<Group[]> {
		return this.groupsService.findAll();
	}

	@Get('workspace/:workspaceId')
	@ApiOperation({ summary: '특정 워크스페이스의 그룹 조회' })
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
	@ApiOperation({ summary: '삭제된 그룹 목록 조회' })
	@ApiResponse({ status: 200, description: '삭제된 그룹 목록', type: [Group] })
	findDeleted(): Promise<Group[]> {
		return this.groupsService.findDeleted();
	}

	@Get(':id')
	@ApiOperation({ summary: '그룹 상세 조회' })
	@ApiParam({
		name: 'id',
		description: '조회할 그룹의 고유 ID',
		schema: { type: 'integer', minimum: 1 },
	})
	@ApiResponse({ status: 200, description: '그룹 상세 정보', type: Group })
	findOne(@Param('id', ParseIntPipe) id: number): Promise<Group> {
		return this.groupsService.findOne(id);
	}

	@Patch(':id')
	@ApiOperation({ summary: '그룹 수정' })
	@ApiParam({
		name: 'id',
		description: '수정할 그룹의 고유 ID',
		schema: { type: 'integer', minimum: 1 },
	})
	@ApiResponse({
		status: 200,
		description: '그룹이 성공적으로 수정됨',
		type: Group,
	})
	update(
		@Param('id', ParseIntPipe) id: number,
		@Body() updateGroupDto: UpdateGroupDto,
		@Req() req: AuthenticatedRequest,
	): Promise<Group> {
		return this.groupsService.update(id, updateGroupDto, req.user.sub);
	}

	@Delete(':id')
	@ApiOperation({ summary: '그룹 삭제' })
	@ApiParam({
		name: 'id',
		description: '삭제할 그룹의 고유 ID',
		schema: { type: 'string' },
	})
	@ApiResponse({ status: 200, description: '그룹이 성공적으로 삭제됨' })
	remove(@Param('id') id: string, @Req() req: AuthenticatedRequest): Promise<void> {
		return this.groupsService.remove(+id, req.user.sub);
	}

	// 멤버 관련 엔드포인트들
	@Post(':id/join')
	@ApiOperation({ summary: '그룹 가입' })
	@ApiParam({
		name: 'id',
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
		@Param('id', ParseIntPipe) id: number,
		@Req() req: AuthenticatedRequest,
	): Promise<GroupUser> {
		return this.groupsService.joinGroup(id, req.user.sub);
	}

	@Delete(':id/leave')
	@ApiOperation({ summary: '그룹 탈퇴' })
	@ApiParam({
		name: 'id',
		description: '탈퇴할 그룹의 고유 ID',
		schema: { type: 'integer', minimum: 1 },
	})
	@ApiResponse({ status: 200, description: '그룹에서 성공적으로 탈퇴됨' })
	@ApiResponse({ status: 400, description: '그룹 멤버가 아님' })
	@ApiResponse({ status: 404, description: '그룹을 찾을 수 없음' })
	@ApiResponse({ status: 409, description: '그룹 소유자는 탈퇴할 수 없음' })
	leaveGroup(
		@Param('id', ParseIntPipe) id: number,
		@Req() req: AuthenticatedRequest,
	): Promise<void> {
		return this.groupsService.leaveGroup(id, req.user.sub);
	}

	@Get(':id/members')
	@ApiOperation({ summary: '그룹 멤버 목록 조회' })
	@ApiParam({
		name: 'id',
		description: '멤버 목록을 조회할 그룹의 고유 ID',
		schema: { type: 'integer', minimum: 1 },
	})
	@ApiResponse({ status: 200, description: '그룹 멤버 목록', type: [GroupUser] })
	@ApiResponse({ status: 404, description: '그룹을 찾을 수 없음' })
	getMembers(@Param('id', ParseIntPipe) id: number): Promise<GroupUser[]> {
		return this.groupsService.getMembers(id);
	}

	@Patch(':id/members/:userId/promote')
	@ApiOperation({
		summary: '멤버를 관리자로 승진',
		description: '그룹 관리자가 일반 멤버를 관리자로 승진시킵니다.',
	})
	@ApiParam({
		name: 'id',
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
		@Param('id', ParseIntPipe) id: number,
		@Param('userId', ParseIntPipe) userId: number,
		@Req() req: AuthenticatedRequest,
	): Promise<GroupUser> {
		return this.groupsService.changeRole(id, userId, GroupRole.ADMIN, req.user.sub);
	}

	@Patch(':id/members/:userId/demote')
	@ApiOperation({
		summary: '관리자를 일반 멤버로 강등',
		description: '그룹 관리자가 다른 관리자를 일반 멤버로 강등시킵니다.',
	})
	@ApiParam({
		name: 'id',
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
		@Param('id', ParseIntPipe) id: number,
		@Param('userId', ParseIntPipe) userId: number,
		@Req() req: AuthenticatedRequest,
	): Promise<GroupUser> {
		return this.groupsService.changeRole(id, userId, GroupRole.MEMBER, req.user.sub);
	}

	@Post(':id/members/:userId')
	@ApiOperation({
		summary: '관리자가 멤버를 그룹에 추가',
		description: '그룹 관리자가 특정 사용자를 그룹에 추가합니다.',
	})
	@ApiParam({
		name: 'id',
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
	@ApiResponse({ status: 403, description: '권한 없음 (관리자 권한 필요)' })
	@ApiResponse({ status: 404, description: '그룹 또는 사용자를 찾을 수 없음' })
	addMember(
		@Param('id', ParseIntPipe) id: number,
		@Param('userId', ParseIntPipe) userId: number,
		@Req() req: AuthenticatedRequest,
	): Promise<GroupUser> {
		return this.groupsService.addMember(id, userId, req.user.sub);
	}

	@Delete(':id/members/:userId')
	@ApiOperation({
		summary: '관리자가 멤버를 그룹에서 제거',
		description: '그룹 관리자가 특정 멤버를 그룹에서 제거합니다.',
	})
	@ApiParam({
		name: 'id',
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
	@ApiResponse({ status: 403, description: '권한 없음 (관리자 권한 필요)' })
	@ApiResponse({ status: 404, description: '그룹 또는 멤버를 찾을 수 없음' })
	removeMember(
		@Param('id', ParseIntPipe) id: number,
		@Param('userId', ParseIntPipe) userId: number,
		@Req() req: AuthenticatedRequest,
	): Promise<void> {
		return this.groupsService.removeMember(id, userId, req.user.sub);
	}
}
