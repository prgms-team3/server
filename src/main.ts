import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { KoreanTimeInterceptor } from './common/interceptors/korean-time.interceptor';

async function bootstrap() {
	try {
		const app = await NestFactory.create(AppModule);

		// CORS 설정 추가
		app.enableCors({
			origin: ['http://localhost:3000', 'http://localhost:3001'], // 프론트엔드 URL
			credentials: true, // 쿠키를 포함한 요청 허용
			methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
			allowedHeaders: [
				'Content-Type',
				'Authorization',
				'Accept',
				'Origin',
				'X-Requested-With',
				'Access-Control-Request-Method',
				'Access-Control-Request-Headers',
			],
		});

		// 쿠키 파서 미들웨어 등록
		app.use(cookieParser());

		// validationPipe 등록 (타입 변환 활성화)
		app.useGlobalPipes(
			new ValidationPipe({
				transform: true,
				transformOptions: { enableImplicitConversion: true },
				whitelist: true,
				forbidNonWhitelisted: true,
			}),
		);

		// 한국 시간 변환 인터셉터 전역 적용
		app.useGlobalInterceptors(new KoreanTimeInterceptor());

		// Swagger 설정
		const config = new DocumentBuilder()
			.setTitle('Place-It API')
			.setDescription('공간 예약 플랫폼 API 문서')
			.setVersion('1.0')
			.addBearerAuth()
			.addTag('Workspaces', '워크스페이스 관리')
			// .addTag('Groups', '그룹 관리')
			// .addTag('User Groups', '사용자 그룹')
			// .addTag('Spaces', '공간 관리')
			// .addTag('Reservations', '예약 관리')
			// .addTag('Workspace Reservations', '워크스페이스 예약 관리')
			.build();

		const document = SwaggerModule.createDocument(app, config);
		SwaggerModule.setup('api', app, document);

		// Cloud Run에서는 0.0.0.0에 바인딩해야 합니다
		const port = process.env.PORT || 8080;
		await app.listen(port, '0.0.0.0');

		console.log(`Application is running on port ${port}`);
		console.log(`Environment: ${process.env.NODE_ENV}`);
	} catch (error) {
		console.error('Failed to start application:', error);
		process.exit(1);
	}
}
bootstrap().catch((err) => console.error(err));
