import {
	Controller,
	Get,
	Post,
	Body,
	Patch,
	Param,
	Delete,
	Query,
	Request,
	ParseIntPipe,
	UseGuards,
} from '@nestjs/common';
import {
	ApiTags,
	ApiOperation,
	ApiResponse,
	ApiParam,
	ApiQuery,
	ApiBearerAuth,
} from '@nestjs/swagger';
import { SpacesService } from '../services/spaces.service';
import { CreateSpaceDto } from '../dto/create-space.dto';
import { UpdateSpaceDto } from '../dto/update-space.dto';
import { CreateUnavailableTimeDto } from '../dto/create-unavailable-time.dto';
import { SpaceQueryDto } from '../dto/space-query.dto';
import { Space } from '../entities/space.entity';
import { UnavailableTime } from '../entities/unavailable-time.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@ApiTags('Spaces')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workspaces/:workspaceId/spaces')
export class SpacesController {
	constructor(private readonly spacesService: SpacesService) {}

	@Post()
	@ApiOperation({ summary: '공간 생성' })
	@ApiParam({ name: 'workspaceId', description: '워크스페이스 ID' })
	@ApiResponse({ status: 201, description: '공간이 성공적으로 생성되었습니다.', type: Space })
	@ApiResponse({ status: 403, description: '워크스페이스 관리자 권한이 없습니다.' })
	async create(
		@Param('workspaceId', ParseIntPipe) workspaceId: number,
		@Body() createSpaceDto: CreateSpaceDto,
		@Request() req: any,
	): Promise<Space> {
		return this.spacesService.create(workspaceId, createSpaceDto, req.user.sub);
	}

	@Get()
	@ApiOperation({ summary: '워크스페이스 내 공간 목록 조회' })
	@ApiParam({ name: 'workspaceId', description: '워크스페이스 ID' })
	@ApiResponse({ status: 200, description: '공간 목록이 성공적으로 조회되었습니다.' })
	@ApiResponse({ status: 403, description: '워크스페이스에 접근할 권한이 없습니다.' })
	async findByWorkspace(
		@Param('workspaceId', ParseIntPipe) workspaceId: number,
		@Query() query: SpaceQueryDto,
		@Request() req: any,
	): Promise<{ spaces: Space[]; total: number }> {
		return this.spacesService.findByWorkspace(workspaceId, query, req.user.sub);
	}

	@Get(':id')
	@ApiOperation({ summary: '공간 상세 조회' })
	@ApiParam({ name: 'workspaceId', description: '워크스페이스 ID' })
	@ApiParam({ name: 'id', description: '공간 ID' })
	@ApiResponse({
		status: 200,
		description: '공간 정보가 성공적으로 조회되었습니다.',
		type: Space,
	})
	@ApiResponse({ status: 404, description: '공간을 찾을 수 없습니다.' })
	@ApiResponse({ status: 403, description: '공간에 접근할 권한이 없습니다.' })
	async findOne(@Param('id', ParseIntPipe) id: number, @Request() req: any): Promise<Space> {
		return this.spacesService.findOne(id, req.user.sub);
	}

	@Patch(':id')
	@ApiOperation({ summary: '공간 정보 수정' })
	@ApiParam({ name: 'workspaceId', description: '워크스페이스 ID' })
	@ApiParam({ name: 'id', description: '공간 ID' })
	@ApiResponse({
		status: 200,
		description: '공간 정보가 성공적으로 수정되었습니다.',
		type: Space,
	})
	@ApiResponse({ status: 404, description: '공간을 찾을 수 없습니다.' })
	@ApiResponse({ status: 403, description: '워크스페이스 관리자 권한이 없습니다.' })
	async update(
		@Param('id', ParseIntPipe) id: number,
		@Body() updateSpaceDto: UpdateSpaceDto,
		@Request() req: any,
	): Promise<Space> {
		return this.spacesService.update(id, updateSpaceDto, req.user.sub);
	}

	@Patch(':id/deactivate')
	@ApiOperation({ summary: '공간 비활성화' })
	@ApiParam({ name: 'workspaceId', description: '워크스페이스 ID' })
	@ApiParam({ name: 'id', description: '공간 ID' })
	@ApiResponse({ status: 200, description: '공간이 성공적으로 비활성화되었습니다.' })
	@ApiResponse({ status: 404, description: '공간을 찾을 수 없습니다.' })
	@ApiResponse({ status: 403, description: '워크스페이스 관리자 권한이 없습니다.' })
	async deActivate(@Param('id', ParseIntPipe) id: number, @Request() req: any): Promise<void> {
		return this.spacesService.deActivate(id, req.user.sub);
	}

	@Patch(':id/activate')
	@ApiOperation({ summary: '공간 활성화' })
	@ApiParam({ name: 'workspaceId', description: '워크스페이스 ID' })
	@ApiParam({ name: 'id', description: '공간 ID' })
	@ApiResponse({ status: 200, description: '공간이 성공적으로 활성화되었습니다.' })
	@ApiResponse({ status: 404, description: '공간을 찾을 수 없습니다.' })
	@ApiResponse({ status: 403, description: '워크스페이스 관리자 권한이 없습니다.' })
	async activate(@Param('id', ParseIntPipe) id: number, @Request() req: any): Promise<void> {
		return this.spacesService.activate(id, req.user.sub);
	}

	@Delete(':id')
	@ApiOperation({ summary: '공간 삭제' })
	@ApiParam({ name: 'workspaceId', description: '워크스페이스 ID' })
	@ApiParam({ name: 'id', description: '공간 ID' })
	@ApiResponse({ status: 200, description: '공간이 성공적으로 삭제되었습니다.' })
	@ApiResponse({ status: 404, description: '공간을 찾을 수 없습니다.' })
	@ApiResponse({ status: 403, description: '워크스페이스 관리자 권한이 없습니다.' })
	async remove(@Param('id', ParseIntPipe) id: number, @Request() req: any): Promise<void> {
		return this.spacesService.remove(id, req.user.sub);
	}

	@Post(':id/unavailable-times')
	@ApiOperation({ summary: '공간 사용 불가 시간 추가' })
	@ApiParam({ name: 'workspaceId', description: '워크스페이스 ID' })
	@ApiParam({ name: 'id', description: '공간 ID' })
	@ApiResponse({
		status: 201,
		description: '사용 불가 시간이 성공적으로 추가되었습니다.',
		type: UnavailableTime,
	})
	@ApiResponse({ status: 404, description: '공간을 찾을 수 없습니다.' })
	@ApiResponse({ status: 403, description: '워크스페이스 관리자 권한이 없습니다.' })
	async addUnavailableTime(
		@Param('id', ParseIntPipe) id: number,
		@Body() createUnavailableTimeDto: CreateUnavailableTimeDto,
		@Request() req: any,
	): Promise<UnavailableTime> {
		return this.spacesService.addUnavailableTime(id, createUnavailableTimeDto, req.user.sub);
	}

	@Get(':id/unavailable-times')
	@ApiOperation({ summary: '공간 사용 불가 시간 조회' })
	@ApiParam({ name: 'workspaceId', description: '워크스페이스 ID' })
	@ApiParam({ name: 'id', description: '공간 ID' })
	@ApiResponse({
		status: 200,
		description: '사용 불가 시간이 성공적으로 조회되었습니다.',
		type: [UnavailableTime],
	})
	@ApiResponse({ status: 404, description: '공간을 찾을 수 없습니다.' })
	async getUnavailableTimes(@Param('id', ParseIntPipe) id: number): Promise<UnavailableTime[]> {
		return this.spacesService.getUnavailableTimes(id);
	}

	@Delete('unavailable-times/:unavailableTimeId')
	@ApiOperation({ summary: '공간 사용 불가 시간 삭제' })
	@ApiParam({ name: 'workspaceId', description: '워크스페이스 ID' })
	@ApiParam({ name: 'unavailableTimeId', description: '사용 불가 시간 ID' })
	@ApiResponse({ status: 200, description: '사용 불가 시간이 성공적으로 삭제되었습니다.' })
	@ApiResponse({ status: 403, description: '워크스페이스 관리자 권한이 없습니다.' })
	@ApiResponse({ status: 404, description: '사용 불가 시간을 찾을 수 없습니다.' })
	async removeUnavailableTime(
		@Param('unavailableTimeId', ParseIntPipe) unavailableTimeId: number,
		@Request() req: any,
	): Promise<void> {
		return this.spacesService.removeUnavailableTime(unavailableTimeId, req.user.sub);
	}
}

@ApiTags('Amenities')
@Controller('amenities')
export class AmenitiesController {
	constructor(private readonly spacesService: SpacesService) {}

	@Get()
	@ApiOperation({ summary: '사용 가능한 시설 목록 조회' })
	@ApiResponse({
		status: 200,
		description: '사용 가능한 시설 목록이 성공적으로 조회되었습니다.',
		type: [String],
	})
	async getAvailableAmenities(): Promise<string[]> {
		return this.spacesService.getAvailableAmenities();
	}
}
