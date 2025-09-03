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
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
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
	create(
		@Body() createGroupDto: CreateGroupDto,
		@Req() req: AuthenticatedRequest,
	): Promise<Group> {
		return this.groupsService.create(createGroupDto, req.user.sub);
	}

	@Get()
	@ApiOperation({ summary: '모든 그룹 조회' })
	@ApiResponse({ status: 200, description: '그룹 목록', type: [Group] })
	findAll(): Promise<Group[]> {
		return this.groupsService.findAll();
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
	@ApiResponse({ status: 200, description: '그룹 상세 정보', type: Group })
	findOne(@Param('id', ParseIntPipe) id: number): Promise<Group> {
		return this.groupsService.findOne(id);
	}

	@Patch(':id')
	@ApiOperation({ summary: '그룹 수정' })
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
	@ApiResponse({ status: 200, description: '그룹이 성공적으로 삭제됨' })
	remove(@Param('id') id: string, @Req() req: AuthenticatedRequest): Promise<void> {
		return this.groupsService.remove(+id, req.user.sub);
	}

	// 멤버 관련 엔드포인트들
	@Post(':id/join')
	@ApiOperation({ summary: '그룹 가입' })
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
	@ApiResponse({ status: 200, description: '그룹 멤버 목록', type: [GroupUser] })
	@ApiResponse({ status: 404, description: '그룹을 찾을 수 없음' })
	getMembers(@Param('id', ParseIntPipe) id: number): Promise<GroupUser[]> {
		return this.groupsService.getMembers(id);
	}

	@Patch(':id/members/:userId/role')
	@ApiOperation({ summary: '멤버 역할 변경' })
	@ApiResponse({
		status: 200,
		description: '멤버 역할이 성공적으로 변경됨',
		type: GroupUser,
	})
	@ApiResponse({ status: 403, description: '권한 없음 (관리자 권한 필요)' })
	@ApiResponse({ status: 404, description: '그룹 또는 멤버를 찾을 수 없음' })
	changeRole(
		@Param('id', ParseIntPipe) id: number,
		@Param('userId', ParseIntPipe) userId: number,
		@Body() roleDto: { role: GroupRole },
		@Req() req: AuthenticatedRequest,
	): Promise<GroupUser> {
		return this.groupsService.changeRole(id, userId, roleDto.role, req.user.sub);
	}

	@Delete(':id/members/:userId')
	@ApiOperation({ summary: '멤버 추방' })
	@ApiResponse({ status: 200, description: '멤버가 성공적으로 추방됨' })
	@ApiResponse({ status: 400, description: '자신을 추방할 수 없음' })
	@ApiResponse({ status: 403, description: '권한 없음 (관리자 권한 필요)' })
	@ApiResponse({ status: 404, description: '그룹 또는 멤버를 찾을 수 없음' })
	kickMember(
		@Param('id', ParseIntPipe) id: number,
		@Param('userId', ParseIntPipe) userId: number,
		@Req() req: AuthenticatedRequest,
	): Promise<void> {
		return this.groupsService.kickMember(id, userId, req.user.sub);
	}
}
