import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateGroupDto } from '../dto/create-group.dto';
import { UpdateGroupDto } from '../dto/update-group.dto';
import { Group } from '../entities/group.entity';

@Injectable()
export class GroupsService {
	constructor(
		@InjectRepository(Group)
		private readonly groupRepository: Repository<Group>,
	) {}

	async create(createGroupDto: CreateGroupDto, creatorId: number): Promise<Group> {
		const group = this.groupRepository.create({
			...createGroupDto,
			creatorId,
		});

		return await this.groupRepository.save(group);
	}

	async findAll(): Promise<Group[]> {
		return await this.groupRepository.find({
			where: { isActive: true },
			order: { createdAt: 'DESC' },
		});
	}

	async findOne(id: number): Promise<Group> {
		const group = await this.groupRepository.findOne({
			where: { id, isActive: true },
		});

		if (!group) {
			throw new NotFoundException(`ID ${id}인 그룹을 찾을 수 없습니다`);
		}

		return group;
	}

	async findByCreator(creatorId: number): Promise<Group[]> {
		return await this.groupRepository.find({
			where: { creatorId, isActive: true },
			order: { createdAt: 'DESC' },
		});
	}

	async update(id: number, updateGroupDto: UpdateGroupDto, userId: number): Promise<Group> {
		const group = await this.findOne(id);

		// 그룹 생성자만 수정 가능
		if (group.creatorId !== userId) {
			throw new ForbiddenException('그룹 생성자만 그룹을 수정할 수 있습니다');
		}

		await this.groupRepository.update(id, updateGroupDto);
		return await this.findOne(id);
	}

	async remove(id: number, userId: number): Promise<void> {
		const group = await this.findOne(id);

		// 그룹 생성자만 삭제 가능
		if (group.creatorId !== userId) {
			throw new ForbiddenException('그룹 생성자만 그룹을 삭제할 수 있습니다');
		}

		// 소프트 삭제 (isActive = false)
		await this.groupRepository.update(id, { isActive: false });
	}
}
