// RUTA: src/modules/categories/categories.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository }       from 'typeorm';
import { MenuCategory }     from './entities/menu-category.entity';
import { CreateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(@InjectRepository(MenuCategory) private repo: Repository<MenuCategory>) {}
  findByMenu(menuId: number) { return this.repo.find({ where: { menuId }, relations: ['dishes'], order: { sortOrder: 'ASC' } }); }
  async findOne(id: number) { const c = await this.repo.findOne({ where: { id }, relations: ['dishes'] }); if (!c) throw new NotFoundException('Categoría no encontrada'); return c; }
  create(menuId: number, dto: CreateCategoryDto) { return this.repo.save(this.repo.create({ ...dto, menuId })); }
  async update(id: number, dto: CreateCategoryDto) { await this.repo.update(id, dto); return this.findOne(id); }
  async updateSort(id: number, sortOrder: number) { await this.repo.update(id, { sortOrder }); return this.findOne(id); }
  async remove(id: number) { await this.repo.update(id, { isActive: false }); return { message: 'Categoría desactivada' }; }
}
