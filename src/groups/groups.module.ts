import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { GroupsController } from './controllers/groups.controller';
import { Group } from './entities/group.entity';
import { GroupsService } from './services/groups.service';

@Module({
	imports: [
		TypeOrmModule.forFeature([Group]),
		forwardRef(() => AuthModule), // JWT 인증을 위해 필요
	],
	controllers: [GroupsController],
	providers: [GroupsService],
	exports: [GroupsService], // 다른 모듈에서 사용할 수 있도록 export
})
export class GroupsModule {}
