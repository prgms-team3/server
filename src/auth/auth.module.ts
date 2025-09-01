import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UsersModule } from '../users/users.module';

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
	],
	controllers: [AuthController],
	providers: [AuthService, JwtAuthGuard],
	exports: [JwtAuthGuard, JwtModule], // JwtAuthGuard와 JwtModule을 다른 모듈에서 사용할 수 있도록 export
})
export class AuthModule {}
