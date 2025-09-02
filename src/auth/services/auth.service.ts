import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { firstValueFrom } from 'rxjs';
import { parseJwtExpiration } from '../../common/utils/time.util';
import { UsersService } from '../../users/services/users.service';

interface KakaoUser {
	id: number;
	kakao_account?: {
		email?: string;
		profile?: {
			nickname?: string;
		};
	};
}

interface TokenResponse {
	accessToken: string;
	refreshToken: string;
	refreshTokenExpiry: number; // 쿠키 만료 시간을 위한 추가
}

@Injectable()
export class AuthService {
	constructor(
		private readonly configService: ConfigService,
		private readonly httpService: HttpService,
		private readonly jwtService: JwtService,
		private readonly usersService: UsersService,
	) {}

	getSocialLoginUrl(provider: string): { url: string } {
		if (provider === 'kakao') {
			const KAKAO_CLIENT_ID = this.configService.getOrThrow<string>('KAKAO_CLIENT_ID');
			const KAKAO_REDIRECT_URI = this.configService.getOrThrow<string>('KAKAO_REDIRECT_URI');

			const url = `https://kauth.kakao.com/oauth/authorize?client_id=${KAKAO_CLIENT_ID}&redirect_uri=${KAKAO_REDIRECT_URI}&response_type=code`;
			return { url };
		}
		// TODO: Google 등 다른 프로바이더 추가
		throw new BadRequestException(`지원하지 않는 프로바이더입니다: ${provider}`);
	}

	async socialLogin(provider: string, code: string): Promise<TokenResponse> {
		if (provider === 'kakao') {
			const accessToken = await this.getKakaoAccessToken(code);
			const kakaoUser: KakaoUser = await this.getKakaoUserInfo(accessToken);

			if (!kakaoUser.kakao_account?.email) {
				throw new BadRequestException(
					'카카오 계정에서 이메일 정보를 가져올 수 없습니다. 동의 항목을 확인해주세요.',
				);
			}

			const nickname = kakaoUser.kakao_account?.profile?.nickname;
			if (!nickname) {
				throw new BadRequestException(
					'카카오 계정에서 닉네임 정보를 가져올 수 없습니다. 동의 항목을 확인해주세요.',
				);
			}

			let user = await this.usersService.findByProviderId(kakaoUser.id.toString(), 'kakao');
			if (!user) {
				user = await this.usersService.create({
					email: kakaoUser.kakao_account.email,
					name: nickname,
					provider: 'kakao',
					providerId: kakaoUser.id.toString(),
				});
			}

			// 토큰 발급
			const newAccessToken = await this.getAccessToken(user.id, user.email);
			const newRefreshToken = await this.getRefreshToken(user.id, user.email);
			await this.saveRefreshToken(newRefreshToken, user.id);

			// 리프레시 토큰 만료 시간 계산
			const refreshTokenExpiry = this.getRefreshTokenExpiryTime();

			return {
				accessToken: newAccessToken,
				refreshToken: newRefreshToken,
				refreshTokenExpiry,
			};
		}
		throw new BadRequestException(`지원하지 않는 프로바이더입니다: ${provider}`);
	}

	private async getKakaoAccessToken(code: string): Promise<string> {
		const KAKAO_CLIENT_ID = this.configService.getOrThrow<string>('KAKAO_CLIENT_ID');
		const KAKAO_REDIRECT_URI = this.configService.getOrThrow<string>('KAKAO_REDIRECT_URI');

		const url = 'https://kauth.kakao.com/oauth/token';
		const headers = {
			'Content-type': 'application/x-www-form-urlencoded;charset=utf-8',
		};
		const data = {
			grant_type: 'authorization_code',
			client_id: KAKAO_CLIENT_ID,
			redirect_uri: KAKAO_REDIRECT_URI,
			code,
		};

		try {
			const response = await firstValueFrom(
				this.httpService.post(url, new URLSearchParams(data).toString(), {
					headers,
				}),
			);
			return response.data.access_token;
		} catch {
			throw new UnauthorizedException('카카오 토큰 발급에 실패했습니다.');
		}
	}

	private async getKakaoUserInfo(accessToken: string): Promise<KakaoUser> {
		const url = 'https://kapi.kakao.com/v2/user/me';
		const headers = {
			Authorization: `Bearer ${accessToken}`,
			'Content-type': 'application/x-www-form-urlencoded;charset=utf-8',
		};

		try {
			const response = await firstValueFrom(this.httpService.get(url, { headers }));
			return response.data;
		} catch {
			throw new UnauthorizedException('카카오 사용자 정보 조회에 실패했습니다.');
		}
	}

	//jwt
	async getAccessToken(userId: number, email: string): Promise<string> {
		const payload = { sub: userId, email };
		const accessToken = await this.jwtService.signAsync(payload, {
			secret: this.configService.getOrThrow<string>('JWT_ACCESS_TOKEN_SECRET'),
			expiresIn: this.configService.getOrThrow<string>('JWT_ACCESS_TOKEN_EXPIRATION_TIME'),
		});
		return accessToken;
	}

	async getRefreshToken(userId: number, email: string): Promise<string> {
		const payload = { sub: userId, email };
		const refreshToken = await this.jwtService.signAsync(payload, {
			secret: this.configService.getOrThrow<string>('JWT_REFRESH_TOKEN_SECRET'),
			expiresIn: this.configService.getOrThrow<string>('JWT_REFRESH_TOKEN_EXPIRATION_TIME'),
		});
		return refreshToken;
	}

	private getRefreshTokenExpiryTime(): number {
		const expirationTime = this.configService.getOrThrow<string>(
			'JWT_REFRESH_TOKEN_EXPIRATION_TIME',
		);
		return parseJwtExpiration(expirationTime);
	}

	async saveRefreshToken(refreshToken: string, userId: number) {
		const currentHashedRefreshToken = await bcrypt.hash(refreshToken, 10);
		await this.usersService.saveHashedRefreshToken(userId, currentHashedRefreshToken);
	}

	async refreshTokenPair(refreshToken: string): Promise<TokenResponse> {
		try {
			const payload = await this.jwtService.verifyAsync(refreshToken, {
				secret: this.configService.getOrThrow<string>('JWT_REFRESH_TOKEN_SECRET'),
			});

			const user = await this.usersService.getUserIfRefreshTokenMatches(
				refreshToken,
				payload.sub,
			);
			if (!user) {
				throw new UnauthorizedException('Invalid refresh token');
			}

			// 새로운 토큰들 발급
			const newAccessToken = await this.getAccessToken(user.id, user.email);
			const newRefreshToken = await this.getRefreshToken(user.id, user.email);
			// 새로운 refresh token을 데이터베이스에 저장
			await this.saveRefreshToken(newRefreshToken, user.id);

			// 리프레시 토큰 만료 시간 계산
			const refreshTokenExpiry = this.getRefreshTokenExpiryTime();

			return {
				accessToken: newAccessToken,
				refreshToken: newRefreshToken,
				refreshTokenExpiry,
			};
		} catch {
			throw new UnauthorizedException('Invalid refresh token');
		}
	}

	async signout(userId: number): Promise<void> {
		try {
			await this.usersService.removeRefreshToken(userId);
			console.log(`User ${userId} signed out successfully`);
		} catch (error) {
			console.error(`Failed to sign out user ${userId}:`, error);
		}
	}
}
