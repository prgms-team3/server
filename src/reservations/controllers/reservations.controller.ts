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
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { ReservationsService } from '../services/reservations.service';
import { CreateReservationDto } from '../dto/create-reservation.dto';
import { UpdateReservationDto } from '../dto/update-reservation.dto';
import { ReservationQueryDto } from '../dto/reservation-query.dto';
import { AvailableTimesQueryDto } from '../dto/available-times-query.dto';
import { Reservation } from '../entities/reservation.entity';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@ApiTags('Reservations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reservations')
export class ReservationsController {
	constructor(private readonly reservationsService: ReservationsService) {}

	@Post()
	@ApiOperation({ summary: '예약 생성' })
	@ApiResponse({
		status: 201,
		description: '예약이 성공적으로 생성되었습니다.',
		type: Reservation,
	})
	@ApiResponse({ status: 400, description: '시작 시간은 종료 시간보다 이전이어야 합니다.' })
	@ApiResponse({ status: 400, description: '과거 시간으로는 예약할 수 없습니다.' })
	@ApiResponse({ status: 400, description: '해당 시간에 공간을 사용할 수 없습니다.' })
	@ApiResponse({ status: 404, description: '공간을 찾을 수 없습니다.' })
	@ApiResponse({ status: 403, description: '워크스페이스에 접근할 권한이 없습니다.' })
	@ApiResponse({ status: 409, description: '예약에 접근할 권한이 없습니다.' })
	@ApiResponse({ status: 409, description: '해당 시간에 이미 예약이 있습니다.' })
	async create(
		@Body() createReservationDto: CreateReservationDto,
		@Request() req: any,
	): Promise<Reservation> {
		return this.reservationsService.create(createReservationDto, req.user.sub);
	}

	@Get('my')
	@ApiOperation({ summary: '내 예약 목록 조회' })
	@ApiResponse({ status: 200, description: '예약 목록이 성공적으로 조회되었습니다.' })
	async findMyReservations(
		@Query() query: ReservationQueryDto,
		@Request() req: any,
	): Promise<{ reservations: Reservation[]; total: number }> {
		return this.reservationsService.findUserReservations(req.user.sub, query);
	}

	@Get(':id')
	@ApiOperation({ summary: '예약 상세 조회' })
	@ApiParam({ name: 'id', description: '예약 ID' })
	@ApiResponse({
		status: 200,
		description: '예약 정보가 성공적으로 조회되었습니다.',
		type: Reservation,
	})
	@ApiResponse({ status: 404, description: '예약을 찾을 수 없습니다.' })
	@ApiResponse({ status: 403, description: '예약에 접근할 권한이 없습니다.' })
	async findOne(
		@Param('id', ParseIntPipe) id: number,
		@Request() req: any,
	): Promise<Reservation> {
		return this.reservationsService.findOne(id, req.user.sub);
	}

	@Patch(':id')
	@ApiOperation({ summary: '예약 수정' })
	@ApiParam({ name: 'id', description: '예약 ID' })
	@ApiResponse({
		status: 200,
		description: '예약이 성공적으로 수정되었습니다.',
		type: Reservation,
	})
	@ApiResponse({ status: 404, description: '예약을 찾을 수 없습니다.' })
	@ApiResponse({ status: 403, description: '예약에 접근할 권한이 없습니다.' })
	@ApiResponse({ status: 400, description: '승인되었거나 완료된 예약은 수정할 수 없습니다.' })
	@ApiResponse({ status: 400, description: '시작 시간은 종료 시간보다 이전이어야 합니다.' })
	@ApiResponse({ status: 409, description: '해당 시간에 이미 예약이 있습니다.' })
	@ApiResponse({ status: 400, description: '해당 시간에 공간을 사용할 수 없습니다.' })
	async update(
		@Param('id', ParseIntPipe) id: number,
		@Body() updateReservationDto: UpdateReservationDto,
		@Request() req: any,
	): Promise<Reservation> {
		return this.reservationsService.update(id, updateReservationDto, req.user.sub);
	}

	@Delete(':id')
	@ApiOperation({ summary: '예약 취소' })
	@ApiParam({ name: 'id', description: '예약 ID' })
	@ApiResponse({ status: 200, description: '예약이 성공적으로 취소되었습니다.' })
	@ApiResponse({ status: 404, description: '예약을 찾을 수 없습니다.' })
	@ApiResponse({ status: 403, description: '예약 취소 권한이 없습니다.' })
	@ApiResponse({
		status: 400,
		description: '이미 취소되었거나 완료된 예약은 취소할 수 없습니다.',
	})
	async cancel(@Param('id', ParseIntPipe) id: number, @Request() req: any): Promise<void> {
		return this.reservationsService.cancel(id, req.user.sub);
	}

	@Post(':id/approve')
	@ApiOperation({ summary: '예약 승인' })
	@ApiParam({ name: 'id', description: '예약 ID' })
	@ApiResponse({ status: 200, description: '예약이 성공적으로 승인되었습니다.' })
	@ApiResponse({ status: 404, description: '예약을 찾을 수 없습니다.' })
	@ApiResponse({ status: 403, description: '예약 승인 권한이 없습니다.' })
	@ApiResponse({ status: 400, description: '대기 중인 예약만 승인할 수 있습니다.' })
	async approve(@Param('id', ParseIntPipe) id: number, @Request() req: any): Promise<void> {
		return this.reservationsService.approve(id, req.user.sub);
	}

	@Post(':id/reject')
	@ApiOperation({ summary: '예약 거절' })
	@ApiParam({ name: 'id', description: '예약 ID' })
	@ApiResponse({ status: 200, description: '예약이 성공적으로 거절되었습니다.' })
	@ApiResponse({ status: 404, description: '예약을 찾을 수 없습니다.' })
	@ApiResponse({ status: 403, description: '예약 거절 권한이 없습니다.' })
	@ApiResponse({ status: 400, description: '대기 중인 예약만 거절할 수 있습니다.' })
	async reject(@Param('id', ParseIntPipe) id: number, @Request() req: any): Promise<void> {
		return this.reservationsService.reject(id, req.user.sub);
	}

	@Get('available-times')
	@ApiOperation({ summary: '예약 가능 시간 조회' })
	@ApiResponse({ status: 200, description: '예약 가능 시간이 성공적으로 조회되었습니다.' })
	@ApiResponse({ status: 404, description: '공간을 찾을 수 없습니다.' })
	@ApiResponse({ status: 403, description: '공간에 접근할 권한이 없습니다.' })
	async getAvailableTimes(
		@Query() query: AvailableTimesQueryDto,
		@Request() req: any,
	): Promise<{ availableSlots: { startTime: string; endTime: string }[] }> {
		return this.reservationsService.getAvailableTimes(query, req.user.sub);
	}
}

@ApiTags('Workspace Reservations')
@Controller('workspaces/:workspaceId/reservations')
export class WorkspaceReservationsController {
	constructor(private readonly reservationsService: ReservationsService) {}

	@Get()
	@ApiOperation({ summary: '워크스페이스 예약 목록 조회 (관리자용)' })
	@ApiParam({ name: 'workspaceId', description: '워크스페이스 ID' })
	@ApiResponse({
		status: 200,
		description: '워크스페이스 예약 목록이 성공적으로 조회되었습니다.',
	})
	@ApiResponse({ status: 403, description: '워크스페이스 관리 권한이 없습니다.' })
	async findWorkspaceReservations(
		@Param('workspaceId', ParseIntPipe) workspaceId: number,
		@Query() query: ReservationQueryDto,
		@Request() req: any,
	): Promise<{ reservations: Reservation[]; total: number }> {
		return this.reservationsService.findWorkspaceReservations(workspaceId, req.user.sub, query);
	}
}
