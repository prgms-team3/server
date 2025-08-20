import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestDbService } from './test-db.service';
import { TestDbController } from './test-db.controller';
import { TestDb } from './entities/test-db.entity';

@Module({
	imports: [TypeOrmModule.forFeature([TestDb])],
	controllers: [TestDbController],
	providers: [TestDbService],
})
export class TestDbModule {}
