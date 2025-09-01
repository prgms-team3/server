import { HttpModule } from '@nestjs/axios';
import { forwardRef, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';
import { AuthController } from './controllers/auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
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
	],
	controllers: [AuthController],
	providers: [AuthService, JwtAuthGuard],
	exports: [JwtAuthGuard, JwtModule], // JwtAuthGuard와 JwtModule을 다른 모듈에서 사용할 수 있도록 export
})
export class AuthModule {}
