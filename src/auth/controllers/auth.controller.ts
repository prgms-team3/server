import {
	Body,
	Controller,
	Get,
	Param,
	Post,
	Query,
	Redirect,
	Req,
	Res,
	UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AuthService } from '../services/auth.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
	constructor(
		private readonly authService: AuthService,
		private readonly configService: ConfigService,
	) {}

	@Post('signout')
	@ApiOperation({ summary: '로그아웃' })
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth()
	async signout(@Req() req: AuthenticatedRequest, @Res() res: Response) {
		// req.user는 JwtAuthGuard에 의해 주입됩니다.
		await this.authService.signout(req.user.sub);

		// 리프레시 토큰 쿠키 삭제
		res.clearCookie('refreshToken');

		return res.json({ message: '로그아웃 되었습니다.' });
	}

	@Get('me')
	@ApiOperation({ summary: 'JWT 토큰 정보 및 디코딩 (테스트용)' })
	async getTokensDebug(@Req() req: Request) {
		const authHeader = req.headers.authorization;
		const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
		const refreshTokenFromCookie = req.cookies?.refreshToken || null;

		// 토큰이 있으면 디코딩 시도
		let decodedAccessToken: any = null;
		let decodedRefreshToken: any = null;
		let accessTokenValid = false;

		if (bearerToken) {
			try {
				// JWT 디코딩 (검증 없이)
				const base64Payload = bearerToken.split('.')[1];
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

		// 리프레시 토큰 디코딩
		if (refreshTokenFromCookie) {
			try {
				const base64Payload = refreshTokenFromCookie.split('.')[1];
				if (base64Payload) {
					decodedRefreshToken = JSON.parse(
						Buffer.from(base64Payload, 'base64').toString(),
					);
					const now = Math.floor(Date.now() / 1000);
					decodedRefreshToken.is_expired = decodedRefreshToken.exp < now;

					decodedRefreshToken.issued_at_readable = new Date(
						decodedRefreshToken.iat * 1000,
					).toLocaleString('ko-KR');
					decodedRefreshToken.expires_at_readable = new Date(
						decodedRefreshToken.exp * 1000,
					).toLocaleString('ko-KR');

					const timeLeft = decodedRefreshToken.exp - now;
					if (timeLeft > 0) {
						const days = Math.floor(timeLeft / 86400);
						const hours = Math.floor((timeLeft % 86400) / 3600);
						const minutes = Math.floor((timeLeft % 3600) / 60);
						decodedRefreshToken.time_remaining = `${days}일 ${hours}시간 ${minutes}분`;
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

		if (!bearerToken) {
			recommendedAction = '로그인이 필요합니다. GET /auth/kakao 로 로그인하세요';
		} else if (bearerToken && !decodedAccessToken?.is_expired) {
			recommendedAction = '정상적으로 인증된 상태입니다';
		} else if (
			decodedAccessToken?.is_expired &&
			refreshTokenFromCookie &&
			!decodedRefreshToken?.is_expired
		) {
			recommendedAction = 'access_token이 만료되었습니다. POST /auth/refresh 를 호출하세요';
		} else if (
			decodedAccessToken?.is_expired &&
			(!refreshTokenFromCookie || decodedRefreshToken?.is_expired)
		) {
			recommendedAction = '모든 토큰이 만료되었습니다. 다시 로그인하세요';
		}

		return {
			message: 'JWT 토큰 완전 분석',
			raw_tokens: {
				authorization_header: authHeader || null,
				bearer_token: bearerToken || null,
				refresh_token_cookie: refreshTokenFromCookie || null,
			},
			decoded_tokens: {
				access_token: decodedAccessToken,
				refresh_token: decodedRefreshToken,
			},
			token_status: {
				has_access_token: !!bearerToken,
				access_token_valid: accessTokenValid,
				has_refresh_token: !!refreshTokenFromCookie,
			},
			recommended_action: recommendedAction,
		};
	}

	@Post('refresh')
	@ApiOperation({
		summary: '액세스 토큰 갱신 (리프레시 토큰은 쿠키에서 자동으로 읽어옴)',
	})
	@ApiResponse({
		status: 200,
		description: '토큰 갱신 성공',
		schema: {
			properties: {
				accessToken: { type: 'string' },
				message: { type: 'string' },
			},
		},
	})
	@ApiResponse({ status: 401, description: '유효하지 않은 refresh token' })
	async refreshToken(@Req() req: Request, @Res() res: Response) {
		const refreshToken = req.cookies?.refreshToken;

		if (!refreshToken) {
			return res.status(401).json({
				message: '리프레시 토큰이 없습니다. 다시 로그인해주세요.',
			});
		}

		try {
			const result = await this.authService.refreshTokenPair(refreshToken);

			// 새로운 리프레시 토큰을 쿠키에 설정
			const isProduction = this.configService.get('NODE_ENV') === 'production';
			res.cookie('refreshToken', result.refreshToken, {
				httpOnly: true,
				secure: isProduction, // HTTPS에서만 전송 (프로덕션)
				sameSite: isProduction ? 'none' : 'lax', // CORS 환경에서는 'none', 로컬에서는 'lax'
				maxAge: result.refreshTokenExpiry, // 밀리초 단위
			});

			return res.json({
				accessToken: result.accessToken,
				message: '토큰이 성공적으로 갱신되었습니다.',
			});
		} catch (error) {
			res.clearCookie('refreshToken');
			return res.status(401).json({
				message: '유효하지 않은 리프레시 토큰입니다. 다시 로그인해주세요.',
			});
		}
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
	@ApiOperation({ summary: '인증서버로 콜백 받는 엔드포인트, 프런트엔드는 사용하지 않음' })
	@ApiParam({
		name: 'provider',
		description: '소셜 로그인 제공자',
		enum: ['kakao', 'google'],
	})
	async socialLoginCallback(
		@Param('provider') provider: string,
		@Query('code') code: string,
		@Res() res: Response,
	) {
		const clientURL = this.configService.getOrThrow<string>('CLIENT_URL');

		try {
			const tokenResponse = await this.authService.socialLogin(provider, code);

			// 리프레시 토큰을 쿠키에 설정
			const isProduction = this.configService.get('NODE_ENV') === 'production';
			res.cookie('refreshToken', tokenResponse.refreshToken, {
				httpOnly: true,
				secure: isProduction,
				sameSite: isProduction ? 'none' : 'lax',
				maxAge: tokenResponse.refreshTokenExpiry,
			});

			// 성공 시: 홈URL/callback?accessToken=... 로 리다이렉트
			const cleanUrl = clientURL.replace(/\/$/, ''); // 끝의 슬래시 제거
			const successUrl = `${cleanUrl}/callback?accessToken=${tokenResponse.accessToken}`;
			return res.redirect(successUrl);
		} catch (error) {
			// 에러 시: 그냥 홈URL로 리다이렉트
			return res.redirect(clientURL);
		}
	}
}
