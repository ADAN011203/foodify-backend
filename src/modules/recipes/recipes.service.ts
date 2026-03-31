// RUTA: src/modules/recipes/recipes.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Recipe }            from './entities/recipe.entity';
import { RecipeIngredient }  from './entities/recipe-ingredient.entity';

@Injectable()
export class RecipesService {
  constructor(
    @InjectRepository(Recipe)           private recipeRepo: Repository<Recipe>,
    @InjectRepository(RecipeIngredient) private ingRepo:    Repository<RecipeIngredient>,
  ) {}

  async findByDish(dishId: number) {
    return this.recipeRepo.findOne({ where: { dishId }, relations: ['ingredients','ingredients.item'] });
  }

  async upsert(dishId: number, dto: any) {
    let recipe = await this.recipeRepo.findOneBy({ dishId });
    if (recipe) {
      await this.recipeRepo.update(recipe.id, { prepTimeMin: dto.prepTimeMin, servings: dto.servings, steps: dto.steps, notes: dto.notes });
      await this.ingRepo.delete({ recipeId: recipe.id });
    } else {
      recipe = await this.recipeRepo.save(this.recipeRepo.create({ dishId, ...dto } as any) as any);
    }
    if (dto.ingredients?.length) {
      const ings = dto.ingredients.map((i: any) => this.ingRepo.create({ ...i, recipeId: recipe.id }));
      await this.ingRepo.save(ings);
    }
    return this.findByDish(dishId);
  }

  async addIngredient(dishId: number, dto: any) {
    const recipe = await this.recipeRepo.findOneBy({ dishId });
    if (!recipe) throw new NotFoundException('Receta no encontrada');
    return this.ingRepo.save(this.ingRepo.create({ ...dto, recipeId: recipe.id }));
  }

  async updateIngredient(ingId: number, dto: any) {
    await this.ingRepo.update(ingId, dto);
    return this.ingRepo.findOneBy({ id: ingId });
  }

  removeIngredient(ingId: number) { return this.ingRepo.delete(ingId); }
}
