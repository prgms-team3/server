import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TestDbService } from './test-db.service';
import { CreateTestDbDto } from './dto/create-test-db.dto';
import { UpdateTestDbDto } from './dto/update-test-db.dto';

@Controller('test-db')
export class TestDbController {
	constructor(private readonly testDbService: TestDbService) {}

	@Post()
	create(@Body() createTestDbDto: CreateTestDbDto) {
		return this.testDbService.create(createTestDbDto);
	}

	@Get()
	findAll() {
		return this.testDbService.findAll();
	}

	@Get(':id')
	findOne(@Param('id') id: string) {
		return this.testDbService.findOne(+id);
	}

	@Patch(':id')
	update(@Param('id') id: string, @Body() updateTestDbDto: UpdateTestDbDto) {
		return this.testDbService.update(+id, updateTestDbDto);
	}

	@Delete(':id')
	remove(@Param('id') id: string) {
		return this.testDbService.remove(+id);
	}
}
