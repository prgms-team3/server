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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../types/authenticated-request';
import { CreateGroupDto } from '../dto/create-group.dto';
import { UpdateGroupDto } from '../dto/update-group.dto';
import { Group } from '../entities/group.entity';
import { GroupsService } from '../services/groups.service';

@ApiTags('Groups')
@Controller('groups')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GroupsController {
	constructor(private readonly groupsService: GroupsService) {}

	@Post()
	@ApiOperation({ summary: '그룹 생성' })
	@ApiResponse({ status: 201, description: '그룹 생성 성공', type: Group })
	@ApiResponse({ status: 401, description: '인증되지 않은 사용자' })
	async create(
		@Body() createGroupDto: CreateGroupDto,
		@Req() req: AuthenticatedRequest,
	): Promise<Group> {
		return await this.groupsService.create(createGroupDto, req.user.sub);
	}

	@Get()
	@ApiOperation({ summary: '모든 그룹 조회' })
	@ApiResponse({ status: 200, description: '그룹 목록', type: [Group] })
	async findAll(): Promise<Group[]> {
		return await this.groupsService.findAll();
	}

	@Get('my')
	@ApiOperation({ summary: '내가 생성한 그룹 조회' })
	@ApiResponse({ status: 200, description: '내 그룹 목록', type: [Group] })
	async findMyGroups(@Req() req: AuthenticatedRequest): Promise<Group[]> {
		return await this.groupsService.findByCreator(req.user.sub);
	}

	@Get(':id')
	@ApiOperation({ summary: '특정 그룹 조회' })
	@ApiParam({ name: 'id', description: '그룹 ID' })
	@ApiResponse({ status: 200, description: '그룹 정보', type: Group })
	@ApiResponse({ status: 404, description: '그룹을 찾을 수 없음' })
	async findOne(@Param('id', ParseIntPipe) id: number): Promise<Group> {
		return await this.groupsService.findOne(id);
	}

	@Patch(':id')
	@ApiOperation({ summary: '그룹 정보 수정' })
	@ApiParam({ name: 'id', description: '그룹 ID' })
	@ApiResponse({ status: 200, description: '수정된 그룹 정보', type: Group })
	@ApiResponse({ status: 403, description: '권한 없음 (생성자만 수정 가능)' })
	@ApiResponse({ status: 404, description: '그룹을 찾을 수 없음' })
	async update(
		@Param('id', ParseIntPipe) id: number,
		@Body() updateGroupDto: UpdateGroupDto,
		@Req() req: AuthenticatedRequest,
	): Promise<Group> {
		return await this.groupsService.update(id, updateGroupDto, req.user.sub);
	}

	@Delete(':id')
	@ApiOperation({ summary: '그룹 삭제' })
	@ApiParam({ name: 'id', description: '그룹 ID' })
	@ApiResponse({ status: 200, description: '그룹 삭제 성공' })
	@ApiResponse({ status: 403, description: '권한 없음 (생성자만 삭제 가능)' })
	@ApiResponse({ status: 404, description: '그룹을 찾을 수 없음' })
	async remove(
		@Param('id', ParseIntPipe) id: number,
		@Req() req: AuthenticatedRequest,
	): Promise<{ message: string }> {
		await this.groupsService.remove(id, req.user.sub);
		return { message: '그룹이 삭제되었습니다' };
	}
}
