// RUTA: src/modules/dishes/dishes.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Dish } from './entities/dish.entity';
import { CreateDishDto } from './dto/dish.dto';

@Injectable()
export class DishesService {
  constructor(@InjectRepository(Dish) private repo: Repository<Dish>) {}

  findAll(
    restaurantId: number,
    filters: { categoryId?: number; available?: boolean; search?: string; menuId?: number },
    role: string = 'restaurant_admin',
  ) {
    const qb = this.repo.createQueryBuilder('d')
      .leftJoinAndSelect('d.category','cat')
      // En strings de QueryBuilder usamos nombres reales de columnas SQL.
      .where('d.restaurant_id = :rid AND d.deleted_at IS NULL', { rid: restaurantId });

    // Roles no-admin solo ven platillos disponibles (waiter, chef, cashier)
    if (role !== 'restaurant_admin') {
      qb.andWhere('d.is_available = :avail', { avail: true });
    } else if (filters.available !== undefined) {
      qb.andWhere('d.is_available = :a', { a: filters.available });
    }

    if (filters.categoryId) qb.andWhere('d.category_id = :cid', { cid: filters.categoryId });
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
    const { cost_est, prep_time_min, category_id, sort_order, is_active, ...rest } = dto as any;
    const setData: any = { ...rest };
    if (cost_est     !== undefined) setData.costEst     = cost_est;
    if (prep_time_min !== undefined) setData.prepTimeMin = prep_time_min;
    if (category_id  !== undefined) setData.category     = { id: category_id };
    if (sort_order   !== undefined) setData.sortOrder    = sort_order;
    if (is_active    !== undefined) setData.isAvailable  = is_active;

    await this.repo
      .createQueryBuilder()
      .update(Dish)
      .set(setData)
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
