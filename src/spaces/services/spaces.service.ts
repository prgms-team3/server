import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Like, Repository } from 'typeorm';
import { ErrorCode } from '../../common/constants/error-codes';
import { AppException } from '../../common/exceptions/app.exception';
import { WorkspaceRole, WorkspaceUser } from '../../workspaces/entities/workspace-user.entity';
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
	) {}

	/**
	 * 공간 생성
	 */
	async create(
		workspaceId: number,
		createSpaceDto: CreateSpaceDto,
		userId: number,
	): Promise<Space> {
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
	): Promise<{ spaces: Space[]; total: number }> {
		// 사용자가 워크스페이스에 속해있는지 확인
		await this.checkUserInWorkspace(userId, workspaceId);

		const { page = 1, limit = 10, search, maxCapacity } = query;
		const skip = (page - 1) * limit;

		const queryBuilder = this.spaceRepository
			.createQueryBuilder('space')
			.leftJoinAndSelect('space.images', 'images')
			.where('space.workspaceId = :workspaceId', { workspaceId })
			.andWhere('space.isActive = :isActive', { isActive: true });

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

		return { spaces, total };
	}

	/**
	 * 공간 상세 조회
	 */
	async findOne(id: number, userId: number): Promise<Space> {
		const space = await this.spaceRepository.findOne({
			where: { id },
			relations: ['workspace', 'images', 'unavailableTimes'],
		});

		if (!space) {
			throw new AppException(ErrorCode.SPACE_NOT_FOUND);
		}

		// 사용자가 워크스페이스에 속해있는지 확인
		await this.checkUserInWorkspace(userId, space.workspaceId);

		return space;
	}

	/**
	 * 공간 수정
	 */
	async update(id: number, updateSpaceDto: UpdateSpaceDto, userId: number): Promise<Space> {
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

		space.deleted = true;
		await this.spaceRepository.save(space);
	}

	/**
	 * 사용 가능한 시설 목록 조회
	 */
	async getAvailableAmenities(): Promise<string[]> {
		return [
			'tv',
			'projector',
			'whiteboard',
			'aircon',
			'microphone',
			'speaker',
			'wifi',
			'parking',
		];
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
			where: { userId, workspaceId, role: WorkspaceRole.ADMIN },
		});

		if (!workspaceUser) {
			throw new AppException(ErrorCode.WORKSPACE_AUTHORIZATION_DENIED);
		}
	}
}
