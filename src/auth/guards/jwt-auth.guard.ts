import {
	Injectable,
	CanActivate,
	ExecutionContext,
	UnauthorizedException,
	Inject,
	forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Request, Response } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
	constructor(
		private readonly jwtService: JwtService,
		private readonly configService: ConfigService,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<Request>();
		const accessToken = request.cookies['access_token'];

		if (!accessToken) {
			throw new UnauthorizedException('로그인이 필요합니다.');
		}

		try {
			const payload = await this.jwtService.verifyAsync(accessToken, {
				secret: this.configService.getOrThrow<string>('JWT_ACCESS_TOKEN_SECRET'),
			});

			// req.user에 사용자 정보 저장
			request['user'] = payload;
		} catch (error) {
			throw new UnauthorizedException('유효하지 않은 토큰입니다.');
		}

		return true;
	}
}
