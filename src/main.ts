import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
	try {
		const app = await NestFactory.create(AppModule);
		
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
