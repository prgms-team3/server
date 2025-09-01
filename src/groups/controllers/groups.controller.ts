import {
	Controller,
	Get,
	Post,
	Body,
	Patch,
	Param,
	Delete,
	UseGuards,
	Request,
	Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateGroupDto } from '../dto/create-group.dto';
import { UpdateGroupDto } from '../dto/update-group.dto';
import { Group } from '../entities/group.entity';
import { GroupMember } from '../entities/group-member.entity';
import { GroupsService } from '../services/groups.service';

@ApiTags('Groups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('groups')
export class GroupsController {
	constructor(private readonly groupsService: GroupsService) {}

	@Post()
	@ApiOperation({ summary: '그룹 생성' })
	@ApiResponse({ status: 201, description: '그룹이 성공적으로 생성됨', type: Group })
	create(@Body() createGroupDto: CreateGroupDto, @Request() req): Promise<Group> {
		return this.groupsService.create(createGroupDto, req.user.id);
	}

	@Get()
	@ApiOperation({ summary: '모든 그룹 조회' })
	@ApiResponse({ status: 200, description: '그룹 목록', type: [Group] })
	findAll(): Promise<Group[]> {
		return this.groupsService.findAll();
	}

	@Get('workspace/:workspaceId')
	@ApiOperation({ summary: '워크스페이스별 그룹 조회' })
	@ApiResponse({ status: 200, description: '워크스페이스 그룹 목록', type: [Group] })
	findByWorkspace(@Param('workspaceId') workspaceId: string): Promise<Group[]> {
		return this.groupsService.findByWorkspace(+workspaceId);
	}

	@Get(':id')
	@ApiOperation({ summary: '그룹 상세 조회' })
	@ApiResponse({ status: 200, description: '그룹 상세 정보', type: Group })
	findOne(@Param('id') id: string): Promise<Group> {
		return this.groupsService.findOne(+id);
	}

	@Patch(':id')
	@ApiOperation({ summary: '그룹 수정' })
	@ApiResponse({ status: 200, description: '그룹이 성공적으로 수정됨', type: Group })
	update(
		@Param('id') id: string,
		@Body() updateGroupDto: UpdateGroupDto,
		@Request() req,
	): Promise<Group> {
		return this.groupsService.update(+id, updateGroupDto, req.user.id);
	}

	@Delete(':id')
	@ApiOperation({ summary: '그룹 삭제' })
	@ApiResponse({ status: 200, description: '그룹이 성공적으로 삭제됨' })
	remove(@Param('id') id: string, @Request() req): Promise<void> {
		return this.groupsService.remove(+id, req.user.id);
	}

	@Post(':id/join')
	@ApiOperation({ summary: '그룹 가입' })
	@ApiResponse({ status: 201, description: '그룹에 성공적으로 가입됨', type: GroupMember })
	joinGroup(@Param('id') id: string, @Request() req): Promise<GroupMember> {
		return this.groupsService.joinGroup(+id, req.user.id);
	}

	@Delete(':id/leave')
	@ApiOperation({ summary: '그룹 탈퇴' })
	@ApiResponse({ status: 200, description: '그룹에서 성공적으로 탈퇴됨' })
	leaveGroup(@Param('id') id: string, @Request() req): Promise<void> {
		return this.groupsService.leaveGroup(+id, req.user.id);
	}
}
