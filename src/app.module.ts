import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
// import { SpacesModule } from './spaces/spaces.module';
// import { ReservationsModule } from './reservations/reservations.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { GroupsModule } from './groups/groups.module';
import { UsersModule } from './users/users.module';
import { WorkspacesModule } from './workspaces/workspaces.module';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
		}),
		TypeOrmModule.forRootAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: (configService: ConfigService) => {
				// NODE_ENV가 'production'일 때 (즉, Cloud Run 환경일 때) 소켓 경로 사용
				const isProduction = configService.get('NODE_ENV') === 'production';

				return {
					type: 'mysql',

					// Cloud SQL 소켓 경로
					socketPath: isProduction
						? `/cloudsql/${configService.get('DB_CONNECTION_NAME')}`
						: undefined,

					// 로컬 개발 환경에서는 host와 port를 사용합니다.
					host: isProduction ? undefined : configService.get('DB_HOST'),
					port: isProduction ? undefined : configService.get('DB_PORT'),

					username: configService.get('DB_USERNAME'),
					password: configService.get('DB_PASSWORD'),
					database: configService.get('DB_NAME'),
					entities: [`${__dirname}/**/*.entity{.ts,.js}`],
					dropSchema: configService.get('DB_DROP_SCHEMA') === 'true',
					synchronize: configService.get('DB_SYNCHRONIZE') === 'true',
				};
			},
		}),
		UsersModule,
		AuthModule,
		WorkspacesModule,
		AuthModule,
		GroupsModule,
		// SpacesModule,
		// ReservationsModule,
	],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule {}
