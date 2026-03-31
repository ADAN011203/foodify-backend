// RUTA: src/modules/menus/menus.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository }       from 'typeorm';
import { Menu }             from './entities/menu.entity';
import { CreateMenuDto }    from './dto/menu.dto';

@Injectable()
export class MenusService {
  constructor(@InjectRepository(Menu) private repo: Repository<Menu>) {}

  findAll(restaurantId: number) {
    return this.repo.find({
      where: { restaurant: { id: restaurantId } },
      relations: ['categories'],
      order: { sortOrder: 'ASC' },
    });
  }

  async findOne(id: number, restaurantId: number) {
    const m = await this.repo.findOne({
      where: { id, restaurant: { id: restaurantId } },
      relations: ['categories', 'categories.dishes'],
    });
    if (!m) throw new NotFoundException('Menú no encontrado');
    return m;
  }

  create(restaurantId: number, dto: CreateMenuDto) {
    return this.repo.save(this.repo.create({ ...dto, restaurant: { id: restaurantId } as any }));
  }

  async update(id: number, restaurantId: number, dto: CreateMenuDto) {
    await this.repo.update({ id, restaurant: { id: restaurantId } }, dto as any);
    return this.findOne(id, restaurantId);
  }

  async updateStatus(id: number, restaurantId: number, isActive: boolean) {
    await this.repo.update({ id, restaurant: { id: restaurantId } }, { isActive });
    return this.findOne(id, restaurantId);
  }

  async remove(id: number, restaurantId: number) {
    await this.repo.update({ id, restaurant: { id: restaurantId } }, { isActive: false });
    return { message: 'Menú desactivado' };
  }

  getCategories(id: number, restaurantId: number) {
    return this.findOne(id, restaurantId).then(m => m.categories);
  }
}

