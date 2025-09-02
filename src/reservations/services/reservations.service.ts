import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Not, In, EntityManager } from 'typeorm';
import { Reservation, ReservationStatus } from '../entities/reservation.entity';
import { Space } from '../../spaces/entities/space.entity';
import { UnavailableTime } from '../../spaces/entities/unavailable-time.entity';
import { WorkspaceUser } from '../../workspaces/entities/workspace-user.entity';
import { CreateReservationDto } from '../dto/create-reservation.dto';
import { UpdateReservationDto } from '../dto/update-reservation.dto';
import { ReservationQueryDto } from '../dto/reservation-query.dto';
import { AvailableTimesQueryDto } from '../dto/available-times-query.dto';
import { AppException } from '../../common/exceptions/app.exception';
import { ErrorCode } from '../../common/constants/error-codes';

@Injectable()
export class ReservationsService {
	constructor(
		@InjectRepository(Reservation)
		private reservationRepository: Repository<Reservation>,
		@InjectRepository(Space)
		private spaceRepository: Repository<Space>,
		@InjectRepository(UnavailableTime)
		private unavailableTimeRepository: Repository<UnavailableTime>,
		@InjectRepository(WorkspaceUser)
		private workspaceUserRepository: Repository<WorkspaceUser>,
		@InjectDataSource()
		private dataSource: EntityManager,
	) {}

	/**
	 * 예약 생성
	 */
	// async create(createReservationDto: CreateReservationDto, userId: number): Promise<Reservation> {
	// 	const { spaceId, startTime, endTime, purpose } = createReservationDto;

	// 	const space = await this.spaceRepository.findOne({
	// 		where: { id: spaceId, isActive: true },
	// 		relations: ['workspace'],
	// 	});

	// 	if (!space) {
	// 		throw new AppException(ErrorCode.SPACE_NOT_FOUND);
	// 	}

	// 	// 사용자가 워크스페이스에 속해있는지 확인
	// 	await this.checkUserInWorkspace(userId, space.workspaceId);

	// 	const reservationStartTime = new Date(startTime);
	// 	const reservationEndTime = new Date(endTime);

	// 	// 시간 유효성 검사
	// 	if (reservationStartTime >= reservationEndTime) {
	// 		throw new AppException({
	// 			code: 'INVALID_TIME_RANGE',
	// 			message: '시작 시간은 종료 시간보다 이전이어야 합니다.',
	// 			status: 400,
	// 		});
	// 	}

	// 	if (reservationStartTime < new Date()) {
	// 		throw new AppException({
	// 			code: 'INVALID_TIME_RANGE',
	// 			message: '과거 시간으로는 예약할 수 없습니다.',
	// 			status: 400,
	// 		});
	// 	}

	// 	// 예약 가능 여부 확인
	// 	await this.checkAvailability(spaceId, reservationStartTime, reservationEndTime);

	// 	// 승인이 필요한 공간인지 확인하여 초기 상태 설정
	// 	const initialStatus = space.requiresApproval
	// 		? ReservationStatus.PENDING
	// 		: ReservationStatus.APPROVED;

	// 	const reservation = this.reservationRepository.create({
	// 		spaceId,
	// 		userId,
	// 		startTime: reservationStartTime,
	// 		endTime: reservationEndTime,
	// 		purpose,
	// 		status: initialStatus,
	// 	});

	// 	const savedReservation = await this.reservationRepository.save(reservation);
	// 	return this.findOne(savedReservation.id, userId);
	// }

	/**
	 * 예약 생성 2
	 */
	async create(createReservationDto: CreateReservationDto, userId: number): Promise<Reservation> {
		return this.dataSource.transaction(async manager => {
			const { spaceId, startTime, endTime, purpose } = createReservationDto;
			const reservationStartTime = new Date(startTime);
			const reservationEndTime = new Date(endTime);
	  
			// 시간 유효성 검사 (트랜잭션 외부에서 수행해도 무방)
			if (reservationStartTime >= reservationEndTime) {
				throw new AppException({
				code: 'INVALID_TIME_RANGE',
				message: '시작 시간은 종료 시간보다 이전이어야 합니다.',
				status: 400,
				});
			}
		
			if (reservationStartTime < new Date()) {
				throw new AppException({
				code: 'INVALID_TIME_RANGE',
				message: '과거 시간으로는 예약할 수 없습니다.',
				status: 400,
				});
			}
		
			// 공간 및 접근 권한 확인
			const space = await manager.findOne(Space, {
				where: { id: spaceId, isActive: true },
				relations: ['workspace'],
			});
		
			if (!space) {
				throw new AppException(ErrorCode.SPACE_NOT_FOUND);
			}

			// 사용자가 워크스페이스에 속해있는지 확인
			await this.checkUserInWorkspace(userId, space.workspaceId);

			// 예약 가능 여부 확인
			await this.checkAvailability(manager, spaceId, reservationStartTime, reservationEndTime);

			// 승인이 필요한 공간인지 확인하여 초기 상태 설정
			const initialStatus = space.requiresApproval
				? ReservationStatus.PENDING
				: ReservationStatus.APPROVED;
			
			// 예약 생성 및 저장
			const reservation = manager.create(Reservation, {
				spaceId,
				userId,
				startTime: reservationStartTime,
				endTime: reservationEndTime,
				purpose,
				status: initialStatus,
			});
			
			return manager.save(reservation);
		});
	  }

	/**
	 * 사용자 예약 목록 조회
	 */
	async findUserReservations(
		userId: number,
		query: ReservationQueryDto,
	): Promise<{ reservations: Reservation[]; total: number }> {
		const { page = 1, limit = 10, status, startDate, endDate } = query;
		const skip = (page - 1) * limit;

		const queryBuilder = this.reservationRepository
			.createQueryBuilder('reservation')
			.leftJoinAndSelect('reservation.space', 'space')
			.leftJoinAndSelect('space.workspace', 'workspace')
			.where('reservation.userId = :userId', { userId });

		if (status) {
			queryBuilder.andWhere('reservation.status = :status', { status });
		}

		if (startDate) {
			queryBuilder.andWhere('reservation.startTime >= :startDate', {
				startDate: new Date(startDate),
			});
		}

		if (endDate) {
			queryBuilder.andWhere('reservation.endTime <= :endDate', {
				endDate: new Date(endDate + 'T23:59:59.999Z'),
			});
		}

		const total = await queryBuilder.getCount();
		const reservations = await queryBuilder
			.orderBy('reservation.startTime', 'DESC')
			.skip(skip)
			.take(limit)
			.getMany();

		return { reservations, total };
	}

	/**
	 * 워크스페이스 예약 목록 조회 (관리자용)
	 */
	async findWorkspaceReservations(
		workspaceId: number,
		userId: number,
		query: ReservationQueryDto,
	): Promise<{ reservations: Reservation[]; total: number }> {
		// 관리자 권한 확인
		await this.checkUserIsAdmin(userId, workspaceId);

		const { page = 1, limit = 10, status, startDate, endDate } = query;
		const skip = (page - 1) * limit;

		const queryBuilder = this.reservationRepository
			.createQueryBuilder('reservation')
			.leftJoinAndSelect('reservation.space', 'space')
			.leftJoinAndSelect('reservation.user', 'user')
			.where('space.workspaceId = :workspaceId', { workspaceId });

		if (status) {
			queryBuilder.andWhere('reservation.status = :status', { status });
		}

		if (startDate) {
			queryBuilder.andWhere('reservation.startTime >= :startDate', {
				startDate: new Date(startDate),
			});
		}

		if (endDate) {
			queryBuilder.andWhere('reservation.endTime <= :endDate', {
				endDate: new Date(endDate + 'T23:59:59.999Z'),
			});
		}

		const total = await queryBuilder.getCount();
		const reservations = await queryBuilder
			.orderBy('reservation.startTime', 'DESC')
			.skip(skip)
			.take(limit)
			.getMany();

		return { reservations, total };
	}

	/**
	 * 예약 상세 조회
	 */
	async findOne(id: number, userId: number): Promise<Reservation> {
		const reservation = await this.reservationRepository.findOne({
			where: { id },
			relations: ['space', 'space.workspace', 'user'],
		});

		if (!reservation) {
			throw new AppException(ErrorCode.RESERVATION_NOT_FOUND);
		}

		// 본인 예약이거나 워크스페이스 관리자인지 확인
		const isOwner = reservation.userId === userId;
		const isAdmin = await this.isWorkspaceAdmin(userId, reservation.space.workspaceId);

		if (!isOwner && !isAdmin) {
			throw new AppException(ErrorCode.RESERVATION_ACCESS_DENIED);
		}

		return reservation;
	}

	/**
	 * 예약 수정
	 */
	async update(
		id: number,
		updateReservationDto: UpdateReservationDto,
		userId: number,
	): Promise<Reservation> {
		return this.dataSource.transaction(async manager => {
			const reservation = await this.reservationRepository.findOne({
				where: { id },
				relations: ['space'],
			});

			if (!reservation) {
				throw new AppException(ErrorCode.RESERVATION_NOT_FOUND);
			}

			// 본인 예약이거나 워크스페이스 관리자인지 확인
			const isOwner = reservation.userId === userId;
			const isAdmin = await this.isWorkspaceAdmin(userId, reservation.space.workspaceId);
			if (!isOwner && !isAdmin) {
				throw new AppException(ErrorCode.RESERVATION_ACCESS_DENIED);
			}

			// 승인된 예약이나 완료된 예약은 수정 불가
			if (
				reservation.status === ReservationStatus.APPROVED ||
				reservation.status === ReservationStatus.COMPLETED
			) {
				throw new AppException({
					code: 'RESERVATION_CANNOT_BE_MODIFIED',
					message: '승인되었거나 완료된 예약은 수정할 수 없습니다.',
					status: 400,
				});
			}

			// 시간 변경이 있는 경우 가용성 확인
			if (updateReservationDto.startTime || updateReservationDto.endTime) {
				const newStartTime = updateReservationDto.startTime
					? new Date(updateReservationDto.startTime)
					: reservation.startTime;
				const newEndTime = updateReservationDto.endTime
					? new Date(updateReservationDto.endTime)
					: reservation.endTime;

				if (newStartTime >= newEndTime) {
					throw new AppException({
						code: 'INVALID_TIME_RANGE',
						message: '시작 시간은 종료 시간보다 이전이어야 합니다.',
						status: 400,
					});
				}

				await this.checkAvailability(manager, reservation.spaceId, newStartTime, newEndTime, id);
			}

			Object.assign(reservation, updateReservationDto);

			// 시간이 변경된 경우 다시 승인 대기 상태로 변경
			if (
				(updateReservationDto.startTime || updateReservationDto.endTime) &&
				reservation.space.requiresApproval
			) {
				reservation.status = ReservationStatus.PENDING;
			}

			await this.reservationRepository.save(reservation);
			return this.findOne(id, userId);
		});
	}

	/**
	 * 예약 취소
	 */
	async cancel(id: number, userId: number): Promise<void> {
		const reservation = await this.reservationRepository.findOne({
			where: { id },
		});

		if (!reservation) {
			throw new AppException(ErrorCode.RESERVATION_NOT_FOUND);
		}

		// 본인 예약인지 확인
		if (reservation.userId !== userId) {
			throw new AppException(ErrorCode.RESERVATION_ACCESS_DENIED);
		}

		// 이미 취소되었거나 완료된 예약은 취소 불가
		if (
			reservation.status === ReservationStatus.CANCELLED ||
			reservation.status === ReservationStatus.COMPLETED
		) {
			throw new AppException({
				code: 'RESERVATION_CANNOT_BE_CANCELLED',
				message: '이미 취소되었거나 완료된 예약은 취소할 수 없습니다.',
				status: 400,
			});
		}

		reservation.status = ReservationStatus.CANCELLED;
		await this.reservationRepository.save(reservation);
	}

	/**
	 * 예약 승인 (관리자용)
	 */
	async approve(id: number, userId: number): Promise<void> {
		const reservation = await this.reservationRepository.findOne({
			where: { id },
			relations: ['space'],
		});

		if (!reservation) {
			throw new AppException(ErrorCode.RESERVATION_NOT_FOUND);
		}

		// 관리자 권한 확인
		await this.checkUserIsAdmin(userId, reservation.space.workspaceId);

		if (reservation.status !== ReservationStatus.PENDING) {
			throw new AppException({
				code: 'RESERVATION_NOT_PENDING',
				message: '대기 중인 예약만 승인할 수 있습니다.',
				status: 400,
			});
		}

		reservation.status = ReservationStatus.APPROVED;
		await this.reservationRepository.save(reservation);
	}

	/**
	 * 예약 거절 (관리자용)
	 */
	async reject(id: number, userId: number): Promise<void> {
		const reservation = await this.reservationRepository.findOne({
			where: { id },
			relations: ['space'],
		});

		if (!reservation) {
			throw new AppException(ErrorCode.RESERVATION_NOT_FOUND);
		}

		// 관리자 권한 확인
		await this.checkUserIsAdmin(userId, reservation.space.workspaceId);

		if (reservation.status !== ReservationStatus.PENDING) {
			throw new AppException({
				code: 'RESERVATION_NOT_PENDING',
				message: '대기 중인 예약만 거절할 수 있습니다.',
				status: 400,
			});
		}

		reservation.status = ReservationStatus.REJECTED;
		await this.reservationRepository.save(reservation);
	}

	/**
	 * 예약 가능 시간 조회
	 */
	async getAvailableTimes(
		query: AvailableTimesQueryDto,
		userId: number,
	): Promise<{ availableSlots: { startTime: string; endTime: string }[] }> {
		const { spaceId, date } = query;

		const space = await this.spaceRepository.findOne({
			where: { id: spaceId, isActive: true },
			relations: ['workspace'],
		});

		if (!space) {
			throw new AppException(ErrorCode.SPACE_NOT_FOUND);
		}

		// 사용자가 워크스페이스에 속해있는지 확인
		await this.checkUserInWorkspace(userId, space.workspaceId);

		const targetDate = new Date(date);
		const startOfDay = new Date(targetDate);
		startOfDay.setHours(0, 0, 0, 0);
		const endOfDay = new Date(targetDate);
		endOfDay.setHours(23, 59, 59, 999);

		// 해당 날짜의 예약된 시간 조회
		const reservations = await this.reservationRepository.find({
			where: {
				spaceId,
				status: In([ReservationStatus.APPROVED, ReservationStatus.PENDING]),
				startTime: Between(startOfDay, endOfDay),
			},
			order: { startTime: 'ASC' },
		});

		// 해당 날짜의 사용 불가 시간 조회
		const unavailableTimes = await this.unavailableTimeRepository.find({
			where: {
				spaceId,
				startTime: Between(startOfDay, endOfDay),
			},
			order: { startTime: 'ASC' },
		});

		// 사용 불가 시간대 계산
		const blockedTimes: Array<{ startTime: Date; endTime: Date }> = [
			...reservations.map((r) => ({ startTime: r.startTime, endTime: r.endTime })),
			...unavailableTimes.map((u) => ({ startTime: u.startTime, endTime: u.endTime })),
		].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

		// 가능한 시간대 계산 (9:00 - 18:00 기준)
		const workingHours = {
			start: new Date(targetDate),
			end: new Date(targetDate),
		};
		workingHours.start.setHours(9, 0, 0, 0);
		workingHours.end.setHours(18, 0, 0, 0);

		const availableSlots: Array<{ startTime: string; endTime: string }> = [];
		let currentTime = workingHours.start;

		for (const blockedTime of blockedTimes) {
			if (currentTime < blockedTime.startTime) {
				availableSlots.push({
					startTime: currentTime.toISOString(),
					endTime: blockedTime.startTime.toISOString(),
				});
			}
			currentTime = new Date(Math.max(currentTime.getTime(), blockedTime.endTime.getTime()));
		}

		// 마지막 블록 이후 남은 시간
		if (currentTime < workingHours.end) {
			availableSlots.push({
				startTime: currentTime.toISOString(),
				endTime: workingHours.end.toISOString(),
			});
		}

		return { availableSlots };
	}

	/**
	 * 예약 가능 여부 확인
	 */
	private async checkAvailability(
		manager: EntityManager,
		spaceId: number,
		startTime: Date,
		endTime: Date,
		excludeReservationId?: number,
	): Promise<void> {
		// 기존 예약과 충돌하는지 확인
		// const conflictingReservations = await this.reservationRepository
		// 	.createQueryBuilder('reservation')
		// 	.where('reservation.spaceId = :spaceId', { spaceId })
		// 	.andWhere('reservation.status IN (:...statuses)', {
		// 		statuses: [ReservationStatus.APPROVED, ReservationStatus.PENDING],
		// 	})
		// 	.andWhere('reservation.startTime < :endTime', { endTime })
		// 	.andWhere('reservation.endTime > :startTime', { startTime })
		// 	.andWhere(excludeReservationId ? 'reservation.id != :excludeId' : '1=1', {
		// 		excludeId: excludeReservationId,
		// 	})
		// 	.getMany();

		// if (conflictingReservations.length > 0) {
		// 	throw new AppException(ErrorCode.RESERVATION_CONFLICT);
		// }

		// 비관적 락을 사용한 예약 가능 여부 확인
		const conflictingReservations = await manager
		.createQueryBuilder(Reservation, 'reservation')
		.setLock('pessimistic_write')
		.where('reservation.spaceId = :spaceId', { spaceId })
		.andWhere('reservation.status IN (:...statuses)', {
		  statuses: [ReservationStatus.APPROVED, ReservationStatus.PENDING],
		})
		.andWhere('reservation.startTime < :endTime', { endTime })
		.andWhere('reservation.endTime > :startTime', { startTime })
		.getMany();
  
		if (conflictingReservations.length > 0) {
			throw new AppException(ErrorCode.RESERVATION_CONFLICT);
		}

		// 사용 불가 시간과 충돌하는지 확인
		const conflictingUnavailableTimes = await this.unavailableTimeRepository
			.createQueryBuilder('unavailable')
			.where('unavailable.spaceId = :spaceId', { spaceId })
			.andWhere('unavailable.startTime < :endTime', { endTime })
			.andWhere('unavailable.endTime > :startTime', { startTime })
			.getMany();

		if (conflictingUnavailableTimes.length > 0) {
			throw new AppException(ErrorCode.SPACE_UNAVAILABLE);
		}
	}

	/**
	 * 사용자가 워크스페이스에 속해있는지 확인
	 */
	private async checkUserInWorkspace(userId: number, workspaceId: number): Promise<void> {
		const workspaceUser = await this.workspaceUserRepository.findOne({
			where: { userId, workspaceId },
		});

		if (!workspaceUser) {
			throw new AppException(ErrorCode.WORKSPACE_ACCESS_DENIED);
		}
	}

	/**
	 * 사용자가 워크스페이스 관리자인지 확인
	 */
	private async checkUserIsAdmin(userId: number, workspaceId: number): Promise<void> {
		const workspaceUser = await this.workspaceUserRepository.findOne({
			where: { userId, workspaceId, isAdmin: true },
		});

		if (!workspaceUser) {
			throw new AppException(ErrorCode.WORKSPACE_ACCESS_DENIED);
		}
	}

	/**
	 * 사용자가 워크스페이스 관리자인지 확인 (boolean 반환)
	 */
	private async isWorkspaceAdmin(userId: number, workspaceId: number): Promise<boolean> {
		const workspaceUser = await this.workspaceUserRepository.findOne({
			where: { userId, workspaceId, isAdmin: true },
		});

		return !!workspaceUser;
	}
}
