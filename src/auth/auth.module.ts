import { HttpModule } from '@nestjs/axios';
import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { WorkspaceUser } from '../workspaces/entities/workspace-user.entity';
import { AuthController } from './controllers/auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { WorkspaceRoleGuard } from './guards/workspace-role.guard';
import { AuthService } from './services/auth.service';

@Module({
	imports: [
		HttpModule,
		forwardRef(() => UsersModule),
		ConfigModule,
		JwtModule.registerAsync({
			imports: [ConfigModule],
			useFactory: async (configService: ConfigService) => ({
				secret: configService.getOrThrow<string>('JWT_ACCESS_TOKEN_SECRET'),
				signOptions: {
					expiresIn: configService.getOrThrow<string>('JWT_ACCESS_TOKEN_EXPIRATION_TIME'),
				},
			}),
			inject: [ConfigService],
		}),
		TypeOrmModule.forFeature([WorkspaceUser]),
	],
	controllers: [AuthController],
	providers: [AuthService, JwtAuthGuard, WorkspaceRoleGuard],
	exports: [JwtAuthGuard, JwtModule, WorkspaceRoleGuard],
})
export class AuthModule {}
