import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { LocationsService } from './locations.service';
import { AdminJwtAuthGuard } from '../admin-auth/admin-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(AdminJwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'COMPLIANCE_OFFICER', 'MANAGER')
@Controller('admin/locations')
export class LocationsAdminController {
  constructor(private locations: LocationsService) {}

  @Get()
  list() {
    return this.locations.listAll();
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }))
  async import(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded.');
    const rows = await this.locations.parseExcel(file.buffer);
    return this.locations.importRows(rows);
  }

  @Patch(':id/active')
  toggleActive(@Param('id') id: string, @Body('active') active: boolean) {
    return this.locations.toggleActive(id, active);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.locations.remove(id);
  }
}
