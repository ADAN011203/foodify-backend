// RUTA: src/modules/users/users-compat.controller.ts
//
// ╔══════════════════════════════════════════════════════════════╗
// ║  ALIAS para la App Android de Jorge                          ║
// ║  Jorge usa: /api/staff                                       ║
// ║  Backend v3.2 usa: /api/v1/users                             ║
// ║                                                              ║
// ║  MAPEO de campos de Jorge → Backend:                         ║
// ║    nombre       → fullName (parte 1)                         ║
// ║    apellido     → fullName (parte 2)                         ║
// ║    email        → email                                      ║
// ║    telefono     → phone                                      ║
// ║    rol          → role (ver tabla de mapeo abajo)            ║
// ║    activo       → isActive                                   ║
// ║    contrasena   → password (hasheada en el service)          ║
// ║    fechaCreacion→ createdAt (formateada dd/MM/yyyy)          ║
// ║                                                              ║
// ║  MAPEO DE ROLES:                                             ║
// ║    Jorge "Admin"   → backend "restaurant_admin"              ║
// ║    Jorge "Mesero"  → backend "waiter"                        ║
// ║    Jorge "Cocina"  → backend "chef"                          ║
// ║    Jorge "Cajero"  → backend "cashier"                       ║
// ║                                                              ║
// ║  NOTA CRÍTICA DE JORGE:                                      ║
// ║  "Un empleado con activo:false no puede obtener token JWT"   ║
// ║  → Esto ya está implementado en AuthService (isActive check) ║
// ╚══════════════════════════════════════════════════════════════╝
import {
  Body, Controller, Delete, Get, Param,
  ParseIntPipe, Post, Put, Query, UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../shared/guards/jwt-auth.guard';
import { RolesGuard }   from '../../shared/guards/roles.guard';
import { Roles, Role }  from '../../shared/decorators/roles.decorator';
import { RestaurantId } from '../../shared/decorators/current-user.decorator';
import { UserRole }     from './entities/user.entity';

// Mapeo bidireccional de roles Jorge ↔ Backend v3.2
const ROLE_JORGE_TO_BACKEND: Record<string, UserRole> = {
  'Admin':   UserRole.RESTAURANT_ADMIN,
  'Mesero':  UserRole.WAITER,
  'Cocina':  UserRole.CHEF,
  'Cajero':  UserRole.CASHIER,
};
const ROLE_BACKEND_TO_JORGE: Record<string, string> = {
  [UserRole.RESTAURANT_ADMIN]: 'Admin',
  [UserRole.WAITER]:           'Mesero',
  [UserRole.CHEF]:             'Cocina',
  [UserRole.CASHIER]:          'Cajero',
  [UserRole.SAAS_ADMIN]:       'Admin',
};

// DTO en formato Jorge
class JorgeStaffDto {
  nombre: string;
  apellido: string;
  email: string;
  telefono?: string;
  rol: string;
  activo?: boolean;
  contrasena?: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.RESTAURANT_ADMIN)
@Controller('staff')    // alias sin /v1 para Jorge
export class UsersCompatController {
  constructor(private readonly svc: UsersService) {}

  /**
   * GET /api/staff
   * Jorge: "Obtener todos los empleados"
   * Filtros: ?rol=Admin|Mesero|Cocina, ?activo=true|false
   */
  @Get()
  async findAll(
    @RestaurantId() rid: number,
    @Query('rol') rol?: string,
    @Query('activo') activo?: boolean,
  ) {
    const users = await this.svc.findAll(rid);
    return users
      .filter(u => {
        if (rol    !== undefined && ROLE_BACKEND_TO_JORGE[u.role] !== rol) return false;
        if (activo !== undefined && u.isActive !== activo) return false;
        return true;
      })
      .map(u => this.toJorgeFormat(u));
  }

  /**
   * POST /api/staff
   * Jorge: "Crear nuevo empleado (Admin registra)"
   * Con contraseña temporal.
   */
  @Post()
  async create(@RestaurantId() rid: number, @Body() body: JorgeStaffDto) {
    const role = ROLE_JORGE_TO_BACKEND[body.rol] ?? UserRole.WAITER;
    const dto  = {
      role,
      fullName: `${body.nombre} ${body.apellido}`.trim(),
      email:    body.email,
      phone:    body.telefono ?? null,
      password: body.contrasena ?? 'temporal1234',
    };
    const user = await this.svc.create(rid, dto as any);
    return this.toJorgeFormat(user);
  }

  /**
   * PUT /api/staff/:id
   * Jorge: "Editar datos o cambiar contraseña"
   */
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: JorgeStaffDto,
  ) {
    const dto: any = {};
    if (body.nombre || body.apellido) {
      dto.fullName = `${body.nombre ?? ''} ${body.apellido ?? ''}`.trim();
    }
    if (body.telefono !== undefined) dto.phone    = body.telefono;
    if (body.activo   !== undefined) dto.isActive = body.activo;
    const user = await this.svc.update(id, dto);
    return this.toJorgeFormat(user);
  }

  /**
   * DELETE /api/staff/:id
   * Jorge: "Eliminar empleado del sistema"
   * Implementado como desactivación (isActive=false) — no borra de BD.
   */
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.svc.remove(id);
  }

  // Convierte entidad v3.2 → formato Jorge
  private toJorgeFormat(user: any) {
    const [nombre = '', ...rest] = (user.fullName ?? '').split(' ');
    const apellido = rest.join(' ');
    return {
      id:           String(user.id),   // Jorge usa UUID String
      nombre,
      apellido,
      email:        user.email,
      telefono:     user.phone ?? '',
      rol:          ROLE_BACKEND_TO_JORGE[user.role] ?? user.role,
      activo:       user.isActive,
      fechaCreacion: user.createdAt
        ? new Date(user.createdAt).toLocaleDateString('es-MX', { day:'2-digit',month:'2-digit',year:'numeric' })
        : '',
      // campos adicionales v3.2 (la App puede ignorarlos)
      roleEnum: user.role,
    };
  }
}
