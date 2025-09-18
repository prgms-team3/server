import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsUrl } from 'class-validator';
import { ImageType } from '../entities/space-image.entity';

export class SpaceImageDto {
  @ApiProperty({
    description: 'Image URL',
    example: 'https://example.com/image.jpg',
  })
  @IsString()
  @IsUrl({}, { message: '유효한 URL 형식이어야 합니다.' })
  imageUrl: string;

  @ApiProperty({
    description: 'Image type',
    example: ImageType.PHOTO,
    enum: ImageType,
    default: ImageType.PHOTO,
  })
  @IsEnum(ImageType, { message: '유효한 이미지 타입이 아닙니다.' })
  imageType: ImageType = ImageType.PHOTO;
}
