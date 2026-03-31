// RUTA: src/modules/recipes/recipes.module.ts
import { Module }        from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecipesController }  from './recipes.controller';
import { RecipesService }     from './recipes.service';
import { Recipe }             from './entities/recipe.entity';
import { RecipeIngredient }   from './entities/recipe-ingredient.entity';

@Module({
  imports:     [TypeOrmModule.forFeature([Recipe, RecipeIngredient])],
  controllers: [RecipesController],
  providers:   [RecipesService],
  exports:     [RecipesService],
})
export class RecipesModule {}
