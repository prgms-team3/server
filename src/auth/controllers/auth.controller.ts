import {
	Controller,
	Get,
	Param,
	Post,
	Query,
	Redirect,
	Req,
	Res,
	UseGuards,
	UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Response, Request } from 'express';

import { AuthService } from '../services/auth.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../types/authenticated-request';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Post('signout')
	@ApiOperation({ summary: '로그아웃' })
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	async signout(@Req() req: AuthenticatedRequest, @Res({ passthrough: true }) res: Response) {
		// req.user는 JwtAuthGuard에 의해 주입됩니다.
		await this.authService.signout(res, req.user.sub);
		return { message: '로그아웃 되었습니다.' };
	}

	@Get('me')
	@ApiOperation({ summary: 'JWT 토큰 정보 및 디코딩 (테스트용)' })
	async getTokensDebug(@Req() req: Request) {
		const accessToken = req.cookies?.access_token;
		const refreshToken = req.cookies?.refresh_token;
		const authHeader = req.headers.authorization;
		const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

		// 토큰이 있으면 디코딩 시도
		let decodedAccessToken: any = null;
		let decodedRefreshToken: any = null;
		let accessTokenValid = false;
		let refreshTokenValid = false;

		if (accessToken) {
			try {
				// JWT 디코딩 (검증 없이)
				const base64Payload = accessToken.split('.')[1];
				if (base64Payload) {
					decodedAccessToken = JSON.parse(
						Buffer.from(base64Payload, 'base64').toString(),
					);
					accessTokenValid = true;
					// 만료 시간 확인
					const now = Math.floor(Date.now() / 1000);
					decodedAccessToken.is_expired = decodedAccessToken.exp < now;

					// 사람이 읽기 쉬운 시간 추가
					decodedAccessToken.issued_at_readable = new Date(
						decodedAccessToken.iat * 1000,
					).toLocaleString('ko-KR');
					decodedAccessToken.expires_at_readable = new Date(
						decodedAccessToken.exp * 1000,
					).toLocaleString('ko-KR');

					// 남은 시간 계산
					const timeLeft = decodedAccessToken.exp - now;
					if (timeLeft > 0) {
						const hours = Math.floor(timeLeft / 3600);
						const minutes = Math.floor((timeLeft % 3600) / 60);
						decodedAccessToken.time_remaining = `${hours}시간 ${minutes}분`;
					} else {
						decodedAccessToken.time_remaining = '만료됨';
					}
				}
			} catch {
				decodedAccessToken = { error: 'Invalid token format' };
			}
		}

		if (refreshToken) {
			try {
				const base64Payload = refreshToken.split('.')[1];
				if (base64Payload) {
					decodedRefreshToken = JSON.parse(
						Buffer.from(base64Payload, 'base64').toString(),
					);
					refreshTokenValid = true;
					// 만료 시간 확인
					const now = Math.floor(Date.now() / 1000);
					decodedRefreshToken.is_expired = decodedRefreshToken.exp < now;

					// 사람이 읽기 쉬운 시간 추가
					decodedRefreshToken.issued_at_readable = new Date(
						decodedRefreshToken.iat * 1000,
					).toLocaleString('ko-KR');
					decodedRefreshToken.expires_at_readable = new Date(
						decodedRefreshToken.exp * 1000,
					).toLocaleString('ko-KR');

					// 남은 시간 계산
					const timeLeft = decodedRefreshToken.exp - now;
					if (timeLeft > 0) {
						const days = Math.floor(timeLeft / 86400);
						const hours = Math.floor((timeLeft % 86400) / 3600);
						decodedRefreshToken.time_remaining = `${days}일 ${hours}시간`;
					} else {
						decodedRefreshToken.time_remaining = '만료됨';
					}
				}
			} catch {
				decodedRefreshToken = { error: 'Invalid token format' };
			}
		}

		// 권장 액션 추가
		let recommendedAction = '';
		if (!accessToken && refreshToken && refreshTokenValid) {
			recommendedAction = 'POST /auth/refresh 를 호출하여 새로운 access_token을 발급받으세요';
		} else if (accessToken && decodedAccessToken?.is_expired && refreshToken) {
			recommendedAction = 'access_token이 만료되었습니다. POST /auth/refresh 를 호출하세요';
		} else if (!accessToken && !refreshToken) {
			recommendedAction = '로그인이 필요합니다. GET /auth/kakao 로 로그인하세요';
		} else if (accessToken && !decodedAccessToken?.is_expired) {
			recommendedAction = '정상적으로 인증된 상태입니다';
		}

		return {
			message: 'JWT 토큰 완전 분석',
			raw_tokens: {
				access_token: accessToken || null,
				refresh_token: refreshToken || null,
				authorization_header: authHeader || null,
				bearer_token: bearerToken || null,
			},
			decoded_tokens: {
				access_token: decodedAccessToken,
				refresh_token: decodedRefreshToken,
			},
			token_status: {
				has_access_token: !!accessToken,
				has_refresh_token: !!refreshToken,
				access_token_valid: accessTokenValid,
				refresh_token_valid: refreshTokenValid,
			},
			recommended_action: recommendedAction,
		};
	}

	@Post('refresh')
	@ApiOperation({ summary: '액세스 토큰 갱신' })
	async refreshToken(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
		const refreshToken = req.cookies?.refresh_token;

		if (!refreshToken) {
			throw new UnauthorizedException('Refresh token not found in cookies');
		}

		// 토큰 갱신
		const result = await this.authService.refreshTokenPair(refreshToken);

		// 새로운 토큰들을 쿠키에 설정
		this.authService.setTokenCookies(res, result.accessToken, result.refreshToken);

		return {
			message: '액세스 토큰과 리프레시 토큰이 갱신되었습니다.',
		};
	}

	@Get(':provider')
	@ApiOperation({ summary: '소셜 로그인 페이지로 리다이렉션' })
	@ApiParam({
		name: 'provider',
		description: '소셜 로그인 제공자 (e.g., kakao, google)',
		enum: ['kakao', 'google'],
	})
	@Redirect()
	socialLogin(@Param('provider') provider: string) {
		const { url } = this.authService.getSocialLoginUrl(provider);
		return { url };
	}

	@Get(':provider/callback')
	@ApiOperation({ summary: '소셜 로그인 콜백' })
	@Redirect()
	async socialLoginCallback(
		@Param('provider') provider: string,
		@Query('code') code: string,
		@Res({ passthrough: true }) res: Response,
	) {
		const redirectUrl = await this.authService.socialLogin(provider, code, res);
		return { url: redirectUrl };
	}
}
