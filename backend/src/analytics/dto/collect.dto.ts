import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const PORTALS = ['web', 'agent', 'admin'] as const;
export type Portal = (typeof PORTALS)[number];

export class CollectDto {
  @IsIn(PORTALS)
  portal!: Portal;

  @IsString()
  @MaxLength(512)
  path!: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  referrer?: string;
}
