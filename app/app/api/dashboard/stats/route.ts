import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener estadísticas
    const [
      totalProducts,
      totalCustomers,
      totalOrders,
      lowStockProducts,
      recentOrders,
      topProducts,
      salesByDay,
    ] = await Promise.all([
      // Total de productos
      prisma.product.count(),

      // Total de clientes
      prisma.customer.count(),

      // Total de órdenes
      prisma.order.count(),

      // Productos con stock bajo
      prisma.product.findMany({
        where: {
          stock: {
            lte: prisma.product.fields.minStock,
          },
        },
        select: {
          id: true,
          name: true,
          sku: true,
          stock: true,
          minStock: true,
        },
        take: 5,
      }),

      // Órdenes recientes
      prisma.order.findMany({
        take: 5,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          customer: {
            select: {
              name: true,
            },
          },
          user: {
            select: {
              name: true,
            },
          },
        },
      }),

      // Productos más vendidos
      prisma.orderItem.groupBy({
        by: ['productId'],
        _sum: {
          quantity: true,
        },
        orderBy: {
          _sum: {
            quantity: 'desc',
          },
        },
        take: 5,
      }),

      // Ventas de los últimos 7 días
      prisma.$queryRaw`
        SELECT 
          DATE("createdAt") as date,
          COUNT(*) as orders,
          SUM(total) as total
        FROM orders
        WHERE "createdAt" >= NOW() - INTERVAL '7 days'
        GROUP BY DATE("createdAt")
        ORDER BY date DESC
      `,
    ]);

    // Obtener detalles de productos más vendidos
    const topProductIds = topProducts.map((p) => p.productId);
    const topProductDetails = await prisma.product.findMany({
      where: {
        id: {
          in: topProductIds,
        },
      },
      select: {
        id: true,
        name: true,
        sku: true,
      },
    });

    const topProductsWithDetails = topProducts.map((item) => {
      const product = topProductDetails.find((p) => p.id === item.productId);
      return {
        ...product,
        totalSold: item._sum.quantity,
      };
    });

    // Calcular ingresos totales
    const totalRevenue = await prisma.order.aggregate({
      _sum: {
        total: true,
      },
      where: {
        status: {
          in: ['COMPLETED', 'PROCESSING'],
        },
      },
    });

    return NextResponse.json({
      totalProducts,
      totalCustomers,
      totalOrders,
      totalRevenue: totalRevenue._sum.total || 0,
      lowStockProducts,
      recentOrders,
      topProducts: topProductsWithDetails,
      salesByDay,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadísticas' },
      { status: 500 }
    );
  }
}