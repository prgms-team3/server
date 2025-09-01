import {
	Body,
	Controller,
	Get,
	Param,
	Post,
	Query,
	Redirect,
	Req,
	UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthenticatedRequest } from '../../types/authenticated-request';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
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
	async signout(@Req() req: AuthenticatedRequest) {
		// req.user는 JwtAuthGuard에 의해 주입됩니다.
		await this.authService.signout(req.user.sub);
		return { message: '로그아웃 되었습니다.' };
	}

	@Get('me')
	@ApiOperation({ summary: 'JWT 토큰 정보 및 디코딩 (테스트용)' })
	async getTokensDebug(@Req() req: Request) {
		const authHeader = req.headers.authorization;
		const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

		// 토큰이 있으면 디코딩 시도
		let decodedAccessToken: any = null;
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

		// 권장 액션 추가
		let recommendedAction = '';
		if (!bearerToken) {
			recommendedAction = '로그인이 필요합니다. GET /auth/kakao 로 로그인하세요';
		} else if (bearerToken && !decodedAccessToken?.is_expired) {
			recommendedAction = '정상적으로 인증된 상태입니다';
		} else if (decodedAccessToken?.is_expired) {
			recommendedAction = 'access_token이 만료되었습니다. POST /auth/refresh 를 호출하세요';
		}

		return {
			message: 'JWT 토큰 완전 분석',
			raw_tokens: {
				authorization_header: authHeader || null,
				bearer_token: bearerToken || null,
			},
			decoded_tokens: {
				access_token: decodedAccessToken,
			},
			token_status: {
				has_access_token: !!bearerToken,
				access_token_valid: accessTokenValid,
			},
			recommended_action: recommendedAction,
		};
	}

	@Post('refresh')
	@ApiOperation({ summary: '액세스 토큰 갱신' })
	@ApiResponse({
		status: 200,
		description: '토큰 갱신 성공',
		schema: {
			properties: {
				accessToken: { type: 'string' },
				refreshToken: { type: 'string' },
			},
		},
	})
	@ApiResponse({ status: 401, description: '유효하지 않은 refresh token' })
	async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
		const result = await this.authService.refreshTokenPair(refreshTokenDto.refreshToken);

		return {
			accessToken: result.accessToken,
			refreshToken: result.refreshToken,
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
	@ApiResponse({
		status: 302,
		description: '로그인 성공 후 클라이언트로 리다이렉트',
		schema: {
			properties: {
				accessToken: { type: 'string' },
				refreshToken: { type: 'string' },
			},
		},
	})
	async socialLoginCallback(@Param('provider') provider: string, @Query('code') code: string) {
		const tokens = await this.authService.socialLogin(provider, code);

		// 바디로 반환 (리다이렉트 없음)
		return {
			accessToken: tokens.accessToken,
			refreshToken: tokens.refreshToken,
			message: '로그인 성공',
		};
	}
}
