import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Like, Repository, In } from 'typeorm';
import { ErrorCode } from '../../common/constants/error-codes';
import { AppException } from '../../common/exceptions/app.exception';
import { WorkspaceRole, WorkspaceUser } from '../../workspaces/entities/workspace-user.entity';
import { Reservation, ReservationStatus } from '../../reservations/entities/reservation.entity';
import { CreateSpaceDto } from '../dto/create-space.dto';
import { CreateUnavailableTimeDto } from '../dto/create-unavailable-time.dto';
import { SpaceQueryDto } from '../dto/space-query.dto';
import { UpdateSpaceDto } from '../dto/update-space.dto';
import { Space } from '../entities/space.entity';
import { UnavailableTime } from '../entities/unavailable-time.entity';
@Injectable()
export class SpacesService {
	constructor(
		@InjectRepository(Space)
		private spaceRepository: Repository<Space>,
		@InjectRepository(UnavailableTime)
		private unavailableTimeRepository: Repository<UnavailableTime>,
		@InjectRepository(WorkspaceUser)
		private workspaceUserRepository: Repository<WorkspaceUser>,
		@InjectRepository(Reservation)
		private reservationRepository: Repository<Reservation>,
	) {}

	/**
	 * 공간 생성
	 */
	async create(
		workspaceId: number,
		createSpaceDto: CreateSpaceDto,
		userId: number,
	): Promise<Space & { monthlyReservationCount: number; currentUtilizationRate: number }> {
		// 관리자 권한 확인
		await this.checkUserIsAdmin(userId, workspaceId);

		const space = this.spaceRepository.create({
			...createSpaceDto,
			workspaceId,
		});

		const savedSpace = await this.spaceRepository.save(space);

		return this.findOne(savedSpace.id, userId);
	}

	/**
	 * 워크스페이스 내 공간 목록 조회 (페이징, 필터링)
	 */
	async findByWorkspace(
		workspaceId: number,
		query: SpaceQueryDto,
		userId: number,
	): Promise<{ spaces: (Space & { monthlyReservationCount: number; currentUtilizationRate: number })[]; total: number }> {
		// 사용자가 워크스페이스에 속해있는지 확인
		await this.checkUserInWorkspace(userId, workspaceId);

		const { page = 1, limit = 10, search, maxCapacity } = query;
		const skip = (page - 1) * limit;

		const queryBuilder = this.spaceRepository
			.createQueryBuilder('space')
			.leftJoinAndSelect('space.images', 'images')
			.where('space.workspaceId = :workspaceId', { workspaceId })
			.andWhere('space.deleted = :deleted', { deleted: false });

		if (search) {
			queryBuilder.andWhere('(space.name LIKE :search OR space.description LIKE :search)', {
				search: `%${search}%`,
			});
		}

		if (maxCapacity) {
			queryBuilder.andWhere('space.capacity <= :maxCapacity', { maxCapacity });
		}

		const total = await queryBuilder.getCount();
		const spaces = await queryBuilder
			.orderBy('space.createdAt', 'DESC')
			.skip(skip)
			.take(limit)
			.getMany();

		// 각 공간에 통계 정보 추가
		const spacesWithStats = await Promise.all(
			spaces.map(space => this.addSpaceStatistics(space))
		);

		return { spaces: spacesWithStats, total };
	}

	/**
	 * 공간 상세 조회
	 */
	async findOne(id: number, userId: number): Promise<Space & { monthlyReservationCount: number; currentUtilizationRate: number }> {
		const space = await this.spaceRepository.findOne({
			where: { id },
			relations: ['workspace', 'images', 'unavailableTimes'],
		});

		if (!space) {
			throw new AppException(ErrorCode.SPACE_NOT_FOUND);
		}

		// 사용자가 워크스페이스에 속해있는지 확인
		await this.checkUserInWorkspace(userId, space.workspaceId);

		// 통계 정보 추가
		return this.addSpaceStatistics(space);
	}

	/**
	 * 공간 수정
	 */
	async update(id: number, updateSpaceDto: UpdateSpaceDto, userId: number): Promise<Space & { monthlyReservationCount: number; currentUtilizationRate: number }> {
		const space = await this.spaceRepository.findOne({
			where: { id },
		});

		if (!space) {
			throw new AppException(ErrorCode.SPACE_NOT_FOUND);
		}

		// 관리자 권한 확인
		await this.checkUserIsAdmin(userId, space.workspaceId);

		Object.assign(space, updateSpaceDto);
		await this.spaceRepository.save(space);

		return this.findOne(id, userId);
	}

	/**
	 * 공간 비활성화
	 */
	async deActivate(id: number, userId: number): Promise<void> {
		const space = await this.spaceRepository.findOne({
			where: { id, isActive: true },
		});

		if (!space) {
			throw new AppException(ErrorCode.SPACE_NOT_FOUND);
		}

		// 관리자 권한 확인
		await this.checkUserIsAdmin(userId, space.workspaceId);

		space.isActive = false;
		await this.spaceRepository.save(space);
	}

	/**
	 * 공간 활성화
	 */
	async activate(id: number, userId: number): Promise<void> {
		const space = await this.spaceRepository.findOne({
			where: { id, isActive: false },
		});

		if (!space) {
			throw new AppException(ErrorCode.SPACE_NOT_FOUND);
		}

		// 관리자 권한 확인
		await this.checkUserIsAdmin(userId, space.workspaceId);

		space.isActive = true;
		await this.spaceRepository.save(space);
	}

	/**
	 * 공간 삭제 (soft delete)
	 */
	async remove(id: number, userId: number): Promise<void> {
		const space = await this.spaceRepository.findOne({
			where: { id },
		});

		if (!space) {
			throw new AppException(ErrorCode.SPACE_NOT_FOUND);
		}

		// 관리자 권한 확인
		await this.checkUserIsAdmin(userId, space.workspaceId);

		space.isActive = false;
		space.deleted = true;
		await this.spaceRepository.save(space);
	}

	/**
	 * 사용 가능한 시설 목록 조회
	 */
	async getAvailableAmenities(): Promise<string[]> {
		return [
			'monitor',
			'projector',
			'whiteboard',
			'aircon',
			'microphone',
			'speaker',
			'wifi',
		];
	}

	/**
	 * 공간의 월간 예약 건수 계산
	 */
	async getMonthlyReservationCount(spaceId: number, date: Date = new Date()): Promise<number> {
		// 한국 시간으로 변환 (UTC에 9시간 추가)
		const koreaDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);

		// 한국 시간 기준으로 월의 시작과 끝 계산
		const startOfMonth = new Date(Date.UTC(
			koreaDate.getUTCFullYear(),
			koreaDate.getUTCMonth(),
			1,
			0, 0, 0, 0
		  ));
		  
		  const endOfMonth = new Date(Date.UTC(
			koreaDate.getUTCFullYear(),
			koreaDate.getUTCMonth() + 1,
			0,
			23, 59, 59, 999
		  ));

		const count = await this.reservationRepository.count({
			where: {
				spaceId,
				status: In([ReservationStatus.APPROVED, ReservationStatus.COMPLETED]),
				startTime: Between(startOfMonth, endOfMonth),
			},
		});

		return count;
	}

	/**
	 * 공간의 현재 이용률 계산 (오늘 기준)
	 */
	async getCurrentUtilizationRate(spaceId: number, date: Date = new Date()): Promise<number> {
		// 한국 시간으로 변환
		const koreaDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  
		// 한국 시간 기준으로 하루의 시작과 끝 계산
		const startOfDay = new Date(Date.UTC(
		  koreaDate.getUTCFullYear(),
		  koreaDate.getUTCMonth(),
		  koreaDate.getUTCDate(),
		  0, 0, 0, 0
		));
		
		const endOfDay = new Date(Date.UTC(
		  koreaDate.getUTCFullYear(),
		  koreaDate.getUTCMonth(),
		  koreaDate.getUTCDate(),
		  23, 59, 59, 999
		));

		// 업무 시간 (9:00 - 18:00) = 9시간 = 540분
		const totalWorkingMinutes = 9 * 60;

		// 해당 날짜의 승인된 예약들 조회
		const reservations = await this.reservationRepository.find({
			where: {
				spaceId,
				status: In([ReservationStatus.APPROVED, ReservationStatus.COMPLETED]),
				startTime: Between(startOfDay, endOfDay),
			},
		});

		// 예약된 총 시간 계산 (분 단위)
		let totalReservedMinutes = 0;
		for (const reservation of reservations) {
			const startTime = new Date(Math.max(reservation.startTime.getTime(), startOfDay.getTime()));
			const endTime = new Date(Math.min(reservation.endTime.getTime(), endOfDay.getTime()));
			
			// 업무 시간 내의 예약 시간만 계산 (9:00 - 18:00)
			const workingStart = new Date(date);
			workingStart.setHours(9, 0, 0, 0);
			const workingEnd = new Date(date);
			workingEnd.setHours(18, 0, 0, 0);

			const reservationStart = new Date(Math.max(startTime.getTime(), workingStart.getTime()));
			const reservationEnd = new Date(Math.min(endTime.getTime(), workingEnd.getTime()));

			if (reservationStart < reservationEnd) {
				const durationMinutes = (reservationEnd.getTime() - reservationStart.getTime()) / (1000 * 60);
				totalReservedMinutes += durationMinutes;
			}
		}

		// 이용률 계산 (백분율)
		const utilizationRate = totalWorkingMinutes > 0 ? (totalReservedMinutes / totalWorkingMinutes) * 100 : 0;
		
		// 100%를 초과하지 않도록 제한
		return Math.min(Math.round(utilizationRate * 100) / 100, 100);
	}

	/**
	 * 공간에 통계 정보 추가
	 */
	private async addSpaceStatistics(space: Space): Promise<Space & { monthlyReservationCount: number; currentUtilizationRate: number }> {
		const [monthlyReservationCount, currentUtilizationRate] = await Promise.all([
			this.getMonthlyReservationCount(space.id),
			this.getCurrentUtilizationRate(space.id),
		]);

		return {
			...space,
			monthlyReservationCount,
			currentUtilizationRate,
		};
	}

	/**
	 * 공간 사용 불가 시간 추가
	 */
	async addUnavailableTime(
		spaceId: number,
		createUnavailableTimeDto: CreateUnavailableTimeDto,
		userId: number,
	): Promise<UnavailableTime> {
		const space = await this.spaceRepository.findOne({
			where: { id: spaceId, isActive: true },
		});

		if (!space) {
			throw new AppException(ErrorCode.SPACE_NOT_FOUND);
		}

		// 관리자 권한 확인
		await this.checkUserIsAdmin(userId, space.workspaceId);

		const startTime = new Date(createUnavailableTimeDto.startTime);
		const endTime = new Date(createUnavailableTimeDto.endTime);

		if (startTime >= endTime) {
			throw new AppException({
				code: 'INVALID_TIME_RANGE',
				message: '시작 시간은 종료 시간보다 이전이어야 합니다.',
				status: 400,
			});
		}

		const unavailableTime = this.unavailableTimeRepository.create({
			spaceId,
			startTime,
			endTime,
			reason: createUnavailableTimeDto.reason,
		});

		return this.unavailableTimeRepository.save(unavailableTime);
	}

	/**
	 * 공간 사용 불가 시간 조회
	 */
	async getUnavailableTimes(spaceId: number): Promise<UnavailableTime[]> {
		return this.unavailableTimeRepository.find({
			where: { spaceId },
		});
	}

	/**
	 * 공간 사용 불가 시간 삭제
	 */
	async removeUnavailableTime(unavailableTimeId: number, userId: number): Promise<void> {
		const unavailableTime = await this.unavailableTimeRepository.findOne({
			where: { id: unavailableTimeId },
			relations: ['space'],
		});

		if (!unavailableTime) {
			throw new AppException({
				code: 'UNAVAILABLE_TIME_NOT_FOUND',
				message: '사용 불가 시간을 찾을 수 없습니다.',
				status: 404,
			});
		}

		// 관리자 권한 확인
		await this.checkUserIsAdmin(userId, unavailableTime.space.workspaceId);

		await this.unavailableTimeRepository.remove(unavailableTime);
	}

	/**
	 * 사용자가 워크스페이스에 속해있는지 확인
	 */
	private async checkUserInWorkspace(userId: number, workspaceId: number): Promise<void> {
		await this.checkPermission(userId, workspaceId, WorkspaceRole.MEMBER);
	}

	/**
	 * 사용자가 워크스페이스 관리자인지 확인
	 */
	private async checkUserIsAdmin(userId: number, workspaceId: number): Promise<void> {
		await this.checkPermission(userId, workspaceId, WorkspaceRole.ADMIN);
	}

	/**
	 * 사용자의 워크스페이스 권한 확인
	 * @param userId 사용자 ID
	 * @param workspaceId 워크스페이스 ID
	 * @param minimumRole 최소 필요 권한
	 */
	private async checkPermission(
		userId: number,
		workspaceId: number,
		minimumRole: WorkspaceRole,
	): Promise<void> {
		const workspaceUser = await this.workspaceUserRepository.findOne({
			where: { userId, workspaceId },
		});

		if (!workspaceUser) {
			throw new AppException(ErrorCode.WORKSPACE_ACCESS_DENIED);
		}

		// 권한 레벨 비교를 위한 매핑
		const roleLevel = {
			[WorkspaceRole.MEMBER]: 1,
			[WorkspaceRole.ADMIN]: 2,
			[WorkspaceRole.SUPER_ADMIN]: 3,
		};

		if (roleLevel[workspaceUser.role] < roleLevel[minimumRole]) {
			throw new AppException(ErrorCode.WORKSPACE_AUTHORIZATION_DENIED);
		}
	}
}
