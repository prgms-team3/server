import { ApiProperty } from '@nestjs/swagger';
import { Workspace } from '../entities/workspace.entity';

export class findMyWorkspacesResponseDto {
  @ApiProperty({ type: [Workspace], description: '워크스페이스 목록' })
  workspaces: Workspace[];

  @ApiProperty({ description: '전체 워크스페이스 수' })
  total: number;
}