import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Limpiar datos existentes
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();

  // Crear usuario admin
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@inventario.com',
      name: 'Administrador',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  // Crear usuario vendedor
  const sellerPassword = await bcrypt.hash('seller123', 10);
  const seller = await prisma.user.create({
    data: {
      email: 'vendedor@inventario.com',
      name: 'Vendedor',
      password: sellerPassword,
      role: 'SELLER',
    },
  });

  // Crear categorías
  const electronics = await prisma.category.create({
    data: { name: 'Electrónica' },
  });

  const clothing = await prisma.category.create({
    data: { name: 'Ropa' },
  });

  const food = await prisma.category.create({
    data: { name: 'Alimentos' },
  });

  // Crear productos
  await prisma.product.createMany({
    data: [
      {
        sku: 'LAPTOP-001',
        name: 'Laptop HP 15"',
        price: 899.99,
        stock: 15,
        minStock: 5,
        categoryId: electronics.id,
      },
      {
        sku: 'MOUSE-001',
        name: 'Mouse Logitech',
        price: 29.99,
        stock: 50,
        minStock: 10,
        categoryId: electronics.id,
      },
      {
        sku: 'TEE-001',
        name: 'Camiseta Nike',
        price: 39.99,
        stock: 100,
        minStock: 20,
        categoryId: clothing.id,
      },
      {
        sku: 'COFFEE-001',
        name: 'Café Premium 500g',
        price: 12.99,
        stock: 200,
        minStock: 30,
        categoryId: food.id,
      },
    ],
  });

  // Crear clientes
  await prisma.customer.createMany({
    data: [
      {
        name: 'Juan Pérez',
        email: 'juan@example.com',
        phone: '+51 999 888 777',
        address: 'Av. Lima 123, Lima',
      },
      {
        name: 'María García',
        email: 'maria@example.com',
        phone: '+51 988 777 666',
        address: 'Jr. Cusco 456, Miraflores',
      },
    ],
  });

  console.log('✅ Database seeded successfully!');
  console.log('\n📧 Credenciales:');
  console.log('Admin: admin@inventario.com / admin123');
  console.log('Vendedor: vendedor@inventario.com / seller123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });