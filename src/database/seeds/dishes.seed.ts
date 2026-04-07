import { DataSource } from 'typeorm';

export async function runDishesSeed(ds: DataSource) {
  const queryRunner = ds.createQueryRunner();
  await queryRunner.connect();

  try {
    const existing = await queryRunner.query(`SELECT COUNT(*) as c FROM dishes WHERE restaurant_id = 3`);
    if (Number(existing[0].c) === 0) {
      // Create some default categories first
      await queryRunner.query(`
        INSERT INTO categories (restaurant_id, name, description, is_active) VALUES
        (3, 'Entradas', 'Deliciosas entradas', 1),
        (3, 'Platos Fuertes', 'Nuestras especialidades', 1),
        (3, 'Bebidas', 'Bebidas frías y calientes', 1),
        (3, 'Postres', 'Para cerrar con broche de oro', 1)
      `);

      const categories = await queryRunner.query(`SELECT id, name FROM categories WHERE restaurant_id = 3`);
      const catMap = {};
      categories.forEach(c => catMap[c.name] = c.id);

      await queryRunner.query(`
        INSERT INTO dishes (restaurant_id, category_id, name, description, price, is_available) VALUES
        (3, ${catMap['Entradas']}, 'Guacamole con Totopos', 'Receta tradicional', 85.00, 1),
        (3, ${catMap['Entradas']}, 'Queso Fundido', 'Con chorizo y tortillas de harina', 110.00, 1),
        (3, ${catMap['Entradas']}, 'Sopa Azteca', 'Con aguacate, queso y chicharrón', 75.00, 1),
        (3, ${catMap['Platos Fuertes']}, 'Tacos al Pastor', 'Orden de 5 tacos con piña', 120.00, 1),
        (3, ${catMap['Platos Fuertes']}, 'Enchiladas Suizas', 'En salsa verde con queso gratinado', 145.00, 1),
        (3, ${catMap['Platos Fuertes']}, 'Pechuga a la Plancha', 'Con ensalada fresca', 130.00, 1),
        (3, ${catMap['Bebidas']}, 'Limonada Mineral', 'Fresca y burbujeante', 45.00, 1),
        (3, ${catMap['Bebidas']}, 'Cerveza Nacional', 'Bien fría', 55.00, 1),
        (3, ${catMap['Postres']}, 'Flan Napolitano', 'Receta casera', 65.00, 1),
        (3, ${catMap['Postres']}, 'Pastel de Chocolate', 'Para los amantes del cacao', 75.00, 1)
      `);
      console.log('[Seed] 10 Platillos de prueba creados para restaurant_id = 3');
    }
  } catch (err) {
    console.error('[Seed] Error al seedear platillos:', err.message);
  } finally {
    await queryRunner.release();
  }
}
