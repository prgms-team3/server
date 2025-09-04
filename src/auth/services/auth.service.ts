import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Auth, google } from 'googleapis';
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

interface GoogleUser {
	sub: string;
	email: string;
	name: string;
	email_verified: boolean;
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

		if (provider === 'google') {
			const GOOGLE_CLIENT_ID = this.configService.getOrThrow<string>('GOOGLE_CLIENT_ID');
			const GOOGLE_REDIRECT_URI = this.configService.getOrThrow<string>('GOOGLE_REDIRECT_URI');

			// response_type을 code로 변경하고 scope 수정
			const scope = encodeURIComponent('openid email profile');
			const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}&response_type=code&scope=${scope}&access_type=offline`;
			return { url };
		}

		throw new BadRequestException(`지원하지 않는 프로바이더입니다: ${provider}`);
	}

	async socialLogin(provider: string, code: string): Promise<TokenResponse> {
		if (provider === 'kakao') {
			const accessToken = await this.getKakaoAccessToken(code);
			const kakaoUser: KakaoUser = await this.getKakaoUserInfo(accessToken);

			if (!kakaoUser.kakao_account?.email) {
				throw new BadRequestException('카카오 계정에서 이메일 정보를 가져올 수 없습니다. 동의 항목을 확인해주세요.');
			}

			const nickname = kakaoUser.kakao_account?.profile?.nickname;
			if (!nickname) {
				throw new BadRequestException('카카오 계정에서 닉네임 정보를 가져올 수 없습니다. 동의 항목을 확인해주세요.');
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

		if (provider === 'google') {
			const accessToken = await this.getGoogleAccessToken(code);
			const googleUser: GoogleUser = await this.getGoogleUserInfo(accessToken);

			if (!googleUser.email || !googleUser.email_verified) {
				throw new BadRequestException('구글 계정에서 인증된 이메일 정보를 가져올 수 없습니다.');
			}

			if (!googleUser.name) {
				throw new BadRequestException('구글 계정에서 이름 정보를 가져올 수 없습니다.');
			}

			let user = await this.usersService.findByProviderId(googleUser.sub, 'google');
			if (!user) {
				user = await this.usersService.create({
					email: googleUser.email,
					name: googleUser.name,
					provider: 'google',
					providerId: googleUser.sub,
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

	private getGoogleOAuth2Client(): Auth.OAuth2Client {
		const GOOGLE_CLIENT_ID = this.configService.getOrThrow<string>('GOOGLE_CLIENT_ID');
		const GOOGLE_CLIENT_SECRET = this.configService.getOrThrow<string>('GOOGLE_CLIENT_SECRET');
		const GOOGLE_REDIRECT_URI = this.configService.getOrThrow<string>('GOOGLE_REDIRECT_URI');

		return new google.auth.OAuth2(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI);
	}

	private async getGoogleAccessToken(code: string): Promise<string> {
		try {
			const oauth2Client = this.getGoogleOAuth2Client();
			const { tokens } = await oauth2Client.getToken(code);
			return tokens.access_token!;
		} catch (error) {
			console.error('Google token error:', error);
			throw new UnauthorizedException('구글 토큰 발급에 실패했습니다.');
		}
	}

	private async getGoogleUserInfo(accessToken: string): Promise<GoogleUser> {
		try {
			const oauth2Client = this.getGoogleOAuth2Client();
			oauth2Client.setCredentials({ access_token: accessToken });

			const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
			const { data } = await oauth2.userinfo.get();

			return {
				sub: data.id!,
				email: data.email!,
				name: data.name!,
				email_verified: data.verified_email || false,
			};
		} catch (error) {
			console.error('Google user info error:', error);
			throw new UnauthorizedException('구글 사용자 정보 조회에 실패했습니다.');
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
		const expirationTime = this.configService.getOrThrow<string>('JWT_REFRESH_TOKEN_EXPIRATION_TIME');
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

			const user = await this.usersService.getUserIfRefreshTokenMatches(refreshToken, payload.sub);
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
