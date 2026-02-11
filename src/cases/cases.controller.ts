import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CasesService } from './cases.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { UpdateCaseStatusDto } from './dto/update-case-status.dto';
import { AssignCaseDto } from './dto/assign-case.dto';
import { UpdateCaseNotesDto } from './dto/update-case-notes.dto';
import { UpdateCaseLocationDto } from './dto/update-case-location.dto';
import { CaseFilterDto } from './dto/case-filter.dto';
import {
  CaseResponseDto,
  PaginatedCasesResponseDto,
} from './dto/case-response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums';
import type { JwtPayload } from '../auth/strategies/jwt.strategy';

@ApiTags('Cases')
@Controller('cases')
export class CasesController {
  constructor(
    private readonly casesService: CasesService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  // ── Citizen endpoints ──────────────────────────────────────────────

  @Get('my-cases')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CITIZEN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get my cases',
    description: 'Get all cases for the authenticated citizen',
  })
  @ApiResponse({ status: 200, type: [CaseResponseDto] })
  async myCases(@CurrentUser() user: JwtPayload) {
    return this.casesService.findByCallerId(user.sub);
  }

  // ── Admin endpoints ────────────────────────────────────────────────

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List all cases',
    description: 'Paginated case list with filtering for admin dashboard',
  })
  @ApiResponse({ status: 200, type: PaginatedCasesResponseDto })
  async findAll(@Query() filter: CaseFilterDto) {
    return this.casesService.findAll(filter);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get case details',
    description: 'Get full case details with audit trail',
  })
  @ApiResponse({ status: 200, type: CaseResponseDto })
  async findOne(@Param('id') id: string) {
    const caseEntity = await this.casesService.findById(id);
    const auditLogs = await this.auditLogsService.findByCase(id);
    return { ...caseEntity, auditLogs };
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update case status' })
  @ApiResponse({ status: 200, type: CaseResponseDto })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateCaseStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.casesService.updateStatus(id, dto.status, user.sub);
  }

  @Patch(':id/assign')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign case to admin' })
  @ApiResponse({ status: 200, type: CaseResponseDto })
  async assign(
    @Param('id') id: string,
    @Body() dto: AssignCaseDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.casesService.assignCase(id, dto.adminUserId, user.sub);
  }

  @Patch(':id/notes')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add resolution notes' })
  @ApiResponse({ status: 200, type: CaseResponseDto })
  async updateNotes(
    @Param('id') id: string,
    @Body() dto: UpdateCaseNotesDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.casesService.updateNotes(id, dto.notes, user.sub);
  }

  @Patch(':id/location')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Set case location',
    description:
      'Set the administrative location where the issue is (for routing)',
  })
  @ApiResponse({ status: 200, type: CaseResponseDto })
  async updateLocation(
    @Param('id') id: string,
    @Body() dto: UpdateCaseLocationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.casesService.updateLocation(id, dto.locationId, user.sub);
  }
}
