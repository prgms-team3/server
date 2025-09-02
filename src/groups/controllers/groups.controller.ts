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
import { GroupMember } from '../entities/group-member.entity';
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

	@Get('workspace/:workspaceId')
	@ApiOperation({ summary: '워크스페이스별 그룹 조회' })
	@ApiResponse({
		status: 200,
		description: '워크스페이스 그룹 목록',
		type: [Group],
	})
	findByWorkspace(@Param('workspaceId') workspaceId: string): Promise<Group[]> {
		return this.groupsService.findByWorkspace(+workspaceId);
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

	@Patch(':id/restore')
	@ApiOperation({ summary: '그룹 복원' })
	@ApiResponse({
		status: 200,
		description: '그룹이 성공적으로 복원됨',
		type: Group,
	})
	restore(@Param('id') id: string, @Req() req: AuthenticatedRequest): Promise<Group> {
		return this.groupsService.restore(+id, req.user.sub);
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
		type: GroupMember,
	})
	joinGroup(@Param('id') id: string, @Req() req: AuthenticatedRequest): Promise<GroupMember> {
		return this.groupsService.joinGroup(+id, req.user.sub);
	}

	@Delete(':id/leave')
	@ApiOperation({ summary: '그룹 탈퇴' })
	@ApiResponse({ status: 200, description: '그룹에서 성공적으로 탈퇴됨' })
	leaveGroup(@Param('id') id: string, @Req() req: AuthenticatedRequest): Promise<void> {
		return this.groupsService.leaveGroup(+id, req.user.sub);
	}

	@Patch(':id/members/:userId/promote')
	@ApiOperation({ summary: '멤버를 관리자로 승격' })
	@ApiResponse({
		status: 200,
		description: '멤버가 관리자로 승격됨',
		type: GroupMember,
	})
	promoteToAdmin(
		@Param('id') id: string,
		@Param('userId') userId: string,
		@Req() req: AuthenticatedRequest,
	): Promise<GroupMember> {
		return this.groupsService.promoteToAdmin(+id, +userId, req.user.sub);
	}

	@Patch(':id/members/:userId/demote')
	@ApiOperation({ summary: '관리자를 멤버로 강등' })
	@ApiResponse({
		status: 200,
		description: '관리자가 멤버로 강등됨',
		type: GroupMember,
	})
	demoteToMember(
		@Param('id') id: string,
		@Param('userId') userId: string,
		@Req() req: AuthenticatedRequest,
	): Promise<GroupMember> {
		return this.groupsService.demoteToMember(+id, +userId, req.user.sub);
	}

	@Delete(':id/members/:userId/kick')
	@ApiOperation({ summary: '멤버 추방' })
	@ApiResponse({ status: 200, description: '멤버가 추방됨' })
	kickMember(
		@Param('id') id: string,
		@Param('userId') userId: string,
		@Req() req: AuthenticatedRequest,
	): Promise<void> {
		return this.groupsService.kickMember(+id, +userId, req.user.sub);
	}
}
