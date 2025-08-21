import { Test, TestingModule } from '@nestjs/testing';
import { TestDbService } from './test-db.service';

describe('TestDbService', () => {
	let service: TestDbService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [TestDbService],
		}).compile();

		service = module.get<TestDbService>(TestDbService);
	});

	it('should be defined', () => {
		expect(service).toBeDefined();
	});
});
