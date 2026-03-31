// RUTA: src/modules/categories/categories.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository }       from 'typeorm';
import { MenuCategory }     from './entities/menu-category.entity';
import { Menu }             from '../menus/entities/menu.entity';
import { CreateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(MenuCategory) private repo: Repository<MenuCategory>,
    @InjectRepository(Menu)         private menuRepo: Repository<Menu>,
  ) {}

  findByMenu(menuId: number) {
    return this.repo.find({ where: { menu: { id: menuId } }, relations: ['dishes'], order: { sortOrder: 'ASC' } });
  }

  async findOne(id: number) {
    const c = await this.repo.findOne({ where: { id }, relations: ['dishes'] });
    if (!c) throw new NotFoundException('Categoría no encontrada');
    return c;
  }

  async create(menuId: number, dto: CreateCategoryDto) {
    // Validar que el menú exista antes de insertar (evita FK 500)
    const menuExists = await this.menuRepo.findOne({ where: { id: menuId } });
    if (!menuExists) throw new NotFoundException(`Menú con id=${menuId} no encontrado`);

    const { sort_order, is_active, sortOrder, ...rest } = dto;
    return this.repo.save(this.repo.create({
      ...rest,
      menu: { id: menuId } as any,
      sortOrder: sort_order ?? sortOrder ?? 0,
      ...(is_active !== undefined && { isActive: is_active }),
    }));
  }

  async update(id: number, dto: CreateCategoryDto) {
    const { sort_order, is_active, sortOrder, ...rest } = dto;
    await this.repo.update(id, {
      ...rest,
      sortOrder: sort_order ?? sortOrder,
      ...(is_active !== undefined && { isActive: is_active }),
    });
    return this.findOne(id);
  }

  async updateSort(id: number, sortOrder: number) {
    await this.repo.update(id, { sortOrder });
    return this.findOne(id);
  }

  async remove(id: number) {
    await this.repo.update(id, { isActive: false });
    return { message: 'Categoría desactivada' };
  }
}
