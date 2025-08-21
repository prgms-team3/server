import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTestDbDto } from './dto/create-test-db.dto';
import { UpdateTestDbDto } from './dto/update-test-db.dto';
import { TestDb } from './entities/test-db.entity';

@Injectable()
export class TestDbService {
	constructor(
		@InjectRepository(TestDb)
		private testDbRepository: Repository<TestDb>,
	) {}

	create(createTestDbDto: CreateTestDbDto) {
		const testDb = this.testDbRepository.create(createTestDbDto);
		return this.testDbRepository.save(testDb);
	}

	findAll() {
		return this.testDbRepository.find();
	}

	findOne(id: number) {
		return this.testDbRepository.findOne({ where: { id } });
	}

	update(id: number, updateTestDbDto: UpdateTestDbDto) {
		return this.testDbRepository.update(id, updateTestDbDto);
	}

	remove(id: number) {
		return this.testDbRepository.delete(id);
	}
}
