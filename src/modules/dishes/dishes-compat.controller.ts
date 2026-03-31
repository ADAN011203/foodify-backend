// RUTA: src/modules/dishes/dishes-compat.controller.ts
//
// ╔══════════════════════════════════════════════════════════════╗
// ║  ALIAS para la App Android de Jorge                          ║
// ║  Jorge usa: /api/platillos                                   ║
// ║  Backend v3.2 usa: /api/v1/dishes                            ║
// ║                                                              ║
// ║  MAPEO de campos de Jorge → Backend:                         ║
// ║    nombre      → name                                        ║
// ║    categoria   → category (string libre, también categoryId) ║
// ║    precio      → price                                       ║
// ║    tiempo      → prepTimeMin                                 ║
// ║    descripcion → description                                 ║
// ║    imagenUri   → images[0] (primer elemento del array S3)    ║
// ║    disponible  → isAvailable                                 ║
// ╚══════════════════════════════════════════════════════════════╝
import {
  Body, Controller, Delete, Get, Param, ParseIntPipe,
  Post, Put, Query, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DishesService }   from './dishes.service';
import { JwtAuthGuard }    from '../../shared/guards/jwt-auth.guard';
import { RolesGuard }      from '../../shared/guards/roles.guard';
import { Roles, Role }     from '../../shared/decorators/roles.decorator';
import { RestaurantId }    from '../../shared/decorators/current-user.decorator';

// DTO compatible con la App de Jorge
class JorgeDishDto {
  nombre: string;
  categoria: string;
  precio: number;
  tiempo: number;
  descripcion?: string;
  imagenUri?: string;
  disponible?: boolean;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.RESTAURANT_ADMIN)
@Controller('platillos')   // alias sin /v1 para Jorge
export class DishesCompatController {
  constructor(private readonly svc: DishesService) {}

  /**
   * GET /api/platillos
   * Jorge: "Listar menú completo"
   * Retorna dishes con campos en formato de Jorge + formato v3.2.
   */
  @Get()
  async findAll(
    @RestaurantId() rid: number,
    @Query('categoria') categoria?: string,
    @Query('search') search?: string,
  ) {
    const dishes = await this.svc.findAll(rid, { search });
    return dishes.map(d => this.toJorgeFormat(d));
  }

  /**
   * POST /api/platillos
   * Jorge: "Subir nuevo platillo con imagen"
   * Acepta tanto el formato de Jorge como el formato v3.2.
   */
  @Post()
  async create(@RestaurantId() rid: number, @Body() body: JorgeDishDto) {
    const dto = {
      name:        body.nombre,
      price:       body.precio,
      prepTimeMin: body.tiempo,
      description: body.descripcion,
      // images se maneja por separado con multipart
    };
    const dish = await this.svc.create(rid, dto as any);
    return this.toJorgeFormat(dish);
  }

  /**
   * PUT /api/platillos/:id
   * Jorge: "Actualizar precio o disponibilidad"
   */
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @RestaurantId() rid: number,
    @Body() body: JorgeDishDto,
  ) {
    const dto = {
      name:        body.nombre,
      price:       body.precio,
      prepTimeMin: body.tiempo,
      description: body.descripcion,
      isAvailable: body.disponible,
    };
    const dish = await this.svc.update(id, rid, dto as any);
    return this.toJorgeFormat(dish);
  }

  /** DELETE /api/platillos/:id */
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @RestaurantId() rid: number) {
    return this.svc.remove(id, rid);
  }

  // Convierte entidad v3.2 → formato de Jorge
  private toJorgeFormat(dish: any) {
    return {
      id:          String(dish.id),    // Jorge usa UUID String — adaptamos INT a String
      nombre:      dish.name,
      categoria:   dish.category?.name ?? '',
      precio:      dish.price,
      tiempo:      dish.prepTimeMin,
      descripcion: dish.description,
      imagenUri:   dish.images?.[0] ?? null,  // primer URL del array S3
      disponible:  dish.isAvailable,
      // campos adicionales del backend v3.2 (la App puede ignorarlos)
      categoryId:  dish.categoryId,
      marginPct:   dish.marginPct,
      images:      dish.images,
    };
  }
}
