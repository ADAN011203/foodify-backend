// RUTA: src/modules/dishes/dishes.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Dish } from './entities/dish.entity';
import { CreateDishDto } from './dto/dish.dto';

@Injectable()
export class DishesService {
  constructor(@InjectRepository(Dish) private repo: Repository<Dish>) {}

  findAll(restaurantId: number, filters: { categoryId?: number; available?: boolean; search?: string; menuId?: number }) {
    const qb = this.repo.createQueryBuilder('d')
      .leftJoinAndSelect('d.category','cat')
      // En strings de QueryBuilder usamos nombres reales de columnas SQL.
      .where('d.restaurant_id = :rid AND d.deleted_at IS NULL', { rid: restaurantId });
    if (filters.categoryId) qb.andWhere('d.category_id = :cid', { cid: filters.categoryId });
    if (filters.available !== undefined) qb.andWhere('d.is_available = :a', { a: filters.available });
    if (filters.search) qb.andWhere('d.name LIKE :s', { s: `%${filters.search}%` });
    return qb.orderBy('d.sort_order','ASC').getMany();
  }

  async findOne(id: number, restaurantId: number) {
    const d = await this.repo.findOne({
      where: { id, restaurant: { id: restaurantId }, deletedAt: IsNull() },
      relations: ['category'],
    });
    if (!d) throw new NotFoundException('Platillo no encontrado');
    return d;
  }

  create(restaurantId: number, dto: CreateDishDto) {
    // Para que TypeORM asigne el restaurant_id en la BD, debemos pasar
    // el objeto de la relación o asignar el ID al objeto restaurant
    return this.repo.save(
      this.repo.create({ 
        ...dto, 
        restaurant: { id: restaurantId } as any 
      })
    );
  }

  async update(id: number, restaurantId: number, dto: UpdateDishDto) {
    await this.repo
      .createQueryBuilder()
      .update(Dish)
      .set(dto as any)
      .where('id = :id AND restaurant_id = :rid', { id, rid: restaurantId })
      .execute();
    return this.findOne(id, restaurantId);
  }

  async toggleAvailability(id: number, restaurantId: number) {
    const dish = await this.findOne(id, restaurantId);
    await this.repo
      .createQueryBuilder()
      .update(Dish)
      .set({ isAvailable: !dish.isAvailable })
      .where('id = :id AND restaurant_id = :rid', { id, rid: restaurantId })
      .execute();
    return this.findOne(id, restaurantId);
  }

  async remove(id: number, restaurantId: number) {
    await this.repo
      .createQueryBuilder()
      .update(Dish)
      .set({ deletedAt: new Date() })
      .where('id = :id AND restaurant_id = :rid', { id, rid: restaurantId })
      .execute();
    return { message: 'Platillo eliminado' };
  }

  async uploadImages(id: number, restaurantId: number, files: Express.Multer.File[]) {
    // TODO: subir a S3 y guardar URLs (máx 3)
    const urls = files.slice(0,3).map((_,i) => `https://s3.amazonaws.com/foodify-assets/${id}-img${i}.jpg`);
    await this.repo
      .createQueryBuilder()
      .update(Dish)
      .set({ images: urls })
      .where('id = :id AND restaurant_id = :rid', { id, rid: restaurantId })
      .execute();
    return { images: urls };
  }
}

// re-export for use in dishes.controller
import { UpdateDishDto } from './dto/dish.dto';
