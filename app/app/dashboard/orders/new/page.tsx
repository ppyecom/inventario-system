'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
}

interface Product {
  id: string;
  sku: string;
  name: string;
  price: number;
  stock: number;
}

interface OrderItem {
  productId: string;
  product?: Product;
  quantity: number;
}

export default function NewOrderPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [items, setItems] = useState<OrderItem[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
  }, []);

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers');
      const data = await response.json();
      setCustomers(data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const addItem = () => {
    setItems([...items, { productId: '', quantity: 1 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    if (field === 'productId') {
      const product = products.find((p) => p.id === value);
      newItems[index] = { ...newItems[index], productId: value, product };
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((total, item) => {
      const product = products.find((p) => p.id === item.productId);
      return total + (product ? product.price * item.quantity : 0);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomerId) {
      alert('Selecciona un cliente');
      return;
    }

    if (items.length === 0) {
      alert('Agrega al menos un producto');
      return;
    }

    // Validar que todos los items tengan producto y cantidad
    for (const item of items) {
      if (!item.productId || item.quantity <= 0) {
        alert('Completa todos los productos y cantidades');
        return;
      }
      const product = products.find((p) => p.id === item.productId);
      if (product && item.quantity > product.stock) {
        alert(
          `Stock insuficiente para ${product.name}. Disponible: ${product.stock}`
        );
        return;
      }
    }

    setLoading(true);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
          notes,
        }),
      });

      if (response.ok) {
        router.push('/dashboard/orders');
      } else {
        const error = await response.json();
        alert(error.error || 'Error al crear orden');
      }
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Error al crear orden');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-md"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-3xl font-bold">Nueva Orden</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Selección de cliente */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Cliente</h2>
          <select
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Seleccionar cliente...</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>
        </div>

        {/* Productos */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Productos</h2>
            <button
              type="button"
              onClick={addItem}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus size={20} />
              Agregar Producto
            </button>
          </div>

          {items.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No hay productos agregados. Click en "Agregar Producto" para
              empezar.
            </p>
          ) : (
            <div className="space-y-4">
              {items.map((item, index) => {
                const product = products.find((p) => p.id === item.productId);
                const subtotal = product ? product.price * item.quantity : 0;

                return (
                  <div
                    key={index}
                    className="flex gap-4 items-start p-4 bg-gray-50 rounded-md"
                  >
                    <div className="flex-1">
                      <select
                        value={item.productId}
                        onChange={(e) =>
                          updateItem(index, 'productId', e.target.value)
                        }
                        className="w-full px-3 py-2 border rounded-md"
                        required
                      >
                        <option value="">Seleccionar producto...</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} - {product.sku} (Stock:{' '}
                            {product.stock}) - ${product.price.toFixed(2)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-32">
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(
                            index,
                            'quantity',
                            parseInt(e.target.value) || 1
                          )
                        }
                        className="w-full px-3 py-2 border rounded-md"
                        placeholder="Cantidad"
                        required
                      />
                    </div>

                    <div className="w-32 px-3 py-2 bg-white border rounded-md text-right font-semibold">
                      ${subtotal.toFixed(2)}
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                );
              })}

              {/* Total */}
              <div className="flex justify-end pt-4 border-t">
                <div className="text-right">
                  <p className="text-gray-600 mb-1">Total:</p>
                  <p className="text-3xl font-bold text-blue-600">
                    ${calculateTotal().toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Notas */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Notas (Opcional)</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={4}
            placeholder="Notas adicionales sobre la orden..."
          />
        </div>

        {/* Botones */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            {loading ? 'Creando orden...' : 'Crear Orden'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-md hover:bg-gray-400 font-semibold"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}