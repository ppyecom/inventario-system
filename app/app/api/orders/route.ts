import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const orderItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive(),
});

const orderSchema = z.object({
  customerId: z.string(),
  items: z.array(orderItemSchema).min(1, 'Debe tener al menos un producto'),
  notes: z.string().optional(),
});

// GET - Listar órdenes
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const orders = await prisma.order.findMany({
      where: status ? { status: status as any } : {},
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Error al obtener órdenes' },
      { status: 500 }
    );
  }
}

// POST - Crear orden
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = orderSchema.parse(body);

    // Usar transacción para asegurar consistencia
    const order = await prisma.$transaction(async (tx) => {
      // Obtener productos con sus precios actuales
      const products = await tx.product.findMany({
        where: {
          id: {
            in: validatedData.items.map((item) => item.productId),
          },
        },
      });

      // Verificar que todos los productos existen
      if (products.length !== validatedData.items.length) {
        throw new Error('Algunos productos no existen');
      }

      // Verificar stock disponible
      for (const item of validatedData.items) {
        const product = products.find((p) => p.id === item.productId);
        if (!product) {
          throw new Error(`Producto ${item.productId} no encontrado`);
        }
        if (product.stock < item.quantity) {
          throw new Error(
            `Stock insuficiente para ${product.name}. Disponible: ${product.stock}`
          );
        }
      }

      // Calcular total
      let total = 0;
      const orderItems = validatedData.items.map((item) => {
        const product = products.find((p) => p.id === item.productId)!;
        const subtotal = product.price * item.quantity;
        total += subtotal;

        return {
          productId: item.productId,
          quantity: item.quantity,
          price: product.price,
        };
      });

      // Crear la orden
      const newOrder = await tx.order.create({
        data: {
          customerId: validatedData.customerId,
          userId: (session.user as any).id,
          total,
          status: 'PENDING',
          notes: validatedData.notes,
          items: {
            create: orderItems,
          },
        },
        include: {
          customer: true,
          user: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      // Descontar stock de cada producto
      for (const item of validatedData.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

      return newOrder;
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Error al crear orden' },
      { status: 500 }
    );
  }
}