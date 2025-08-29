import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
// import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { UsersModule } from '../users/users.module';

@Module({
	imports: [
		HttpModule,
		UsersModule,
		ConfigModule,
		// JwtModule.registerAsync({
		// 	imports: [ConfigModule],
		// 	useFactory: async (configService: ConfigService) => ({
		// 		secret: configService.getOrThrow<string>('JWT_SECRET'),
		// 		signOptions: { expiresIn: '1d' },
		// 	}),
		// 	inject: [ConfigService],
		// }),
	],
	controllers: [AuthController],
	providers: [AuthService],
})
export class AuthModule {}