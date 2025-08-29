import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { User } from '../entities/user.entity';
import { ErrorCode } from '../../common/constants/error-codes';

@Injectable()
export class UsersService {
	constructor(
		@InjectRepository(User)
		private readonly userRepository: Repository<User>,
	) {}

	async create(createUserDto: CreateUserDto): Promise<User> {
		const { email } = createUserDto;

		const existingUser = await this.userRepository.findOne({ where: { email } });
		if (existingUser) {
			throw new ConflictException(ErrorCode.USER_ALREADY_EXISTS);
		}

		const user = this.userRepository.create(createUserDto);
		return this.userRepository.save(user);
	}

	async findAll(): Promise<User[]> {
		return this.userRepository.find();
	}

	async findOne(id: number): Promise<User> {
		const user = await this.userRepository.findOne({ where: { id } });
		if (!user) {
			throw new NotFoundException(ErrorCode.USER_NOT_FOUND);
		}
		return user;
	}

	async findByProviderId(providerId: string, provider: string): Promise<User | null> {
		return this.userRepository.findOne({ where: { providerId, provider } });
	}

	async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
		const user = await this.findOne(id); // findOne이 사용자를 찾지 못하면 에러를 던집니다.
		Object.assign(user, updateUserDto);
		return this.userRepository.save(user);
	}

	async remove(id: number): Promise<void> {
		const result = await this.userRepository.delete(id);
		if (result.affected === 0) {
			throw new NotFoundException(ErrorCode.USER_NOT_FOUND);
		}
	}
}
