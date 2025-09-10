import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { convertDatesToKoreanTime } from '../utils/time.util';

/**
 * 응답의 모든 Date 객체를 한국 시간(KST)으로 변환하는 인터셉터
 */
@Injectable()
export class KoreanTimeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        // 응답 데이터의 모든 Date 객체를 한국 시간으로 변환
        return convertDatesToKoreanTime(data);
      }),
    );
  }
}
