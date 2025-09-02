import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UsersController } from './controllers/users.controller';
import { User } from './entities/user.entity';
import { UsersService } from './services/users.service';

@Module({
	imports: [TypeOrmModule.forFeature([User]), forwardRef(() => AuthModule)],
	exports: [UsersService],
	controllers: [UsersController],
	providers: [UsersService],
})
export class UsersModule {}
