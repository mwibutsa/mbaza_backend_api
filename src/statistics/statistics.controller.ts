import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { StatisticsService } from './statistics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';

@ApiTags('Statistics')
@Controller('statistics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@ApiBearerAuth()
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Dashboard overview',
    description: 'Total cases grouped by status and urgency',
  })
  @ApiResponse({ status: 200 })
  async overview() {
    return this.statisticsService.getOverview();
  }

  @Get('by-category')
  @ApiOperation({
    summary: 'Cases by category',
    description: 'Case counts grouped by AI category',
  })
  @ApiResponse({ status: 200 })
  async byCategory() {
    return this.statisticsService.getByCategory();
  }

  @Get('by-location')
  @ApiOperation({
    summary: 'Cases by location',
    description: 'Case counts grouped by district',
  })
  @ApiResponse({ status: 200 })
  async byLocation() {
    return this.statisticsService.getByLocation();
  }

  @Get('trends')
  @ApiOperation({ summary: 'Case trends', description: 'Case count over time' })
  @ApiQuery({
    name: 'period',
    enum: ['daily', 'weekly', 'monthly'],
    required: false,
  })
  @ApiResponse({ status: 200 })
  async trends(
    @Query('period') period: 'daily' | 'weekly' | 'monthly' = 'daily',
  ) {
    return this.statisticsService.getTrends(period);
  }
}
