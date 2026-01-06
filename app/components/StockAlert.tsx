'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface LowStockProduct {
  id: string;
  name: string;
  stock: number;
  minStock: number;
}

export default function StockAlert() {
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);

  useEffect(() => {
    checkLowStock();
    
    // Verificar cada 2 minutos
    const interval = setInterval(checkLowStock, 120000);
    return () => clearInterval(interval);
  }, []);

  const checkLowStock = async () => {
    try {
      const response = await fetch('/api/dashboard/stats');
      const data = await response.json();
      
      if (data.lowStockProducts) {
        setLowStockProducts(data.lowStockProducts);
      }
    } catch (error) {
      console.error('Error checking stock:', error);
    }
  };

  const dismiss = (id: string) => {
    setDismissed([...dismissed, id]);
  };

  const visibleAlerts = lowStockProducts.filter(p => !dismissed.includes(p.id));

  if (visibleAlerts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
      {visibleAlerts.map((product) => (
        <div
          key={product.id}
          className="bg-red-500 text-white rounded-lg shadow-lg p-4 flex items-start gap-3 animate-slide-in"
        >
          <AlertTriangle className="flex-shrink-0 mt-0.5" size={20} />
          <div className="flex-1">
            <p className="font-semibold">Stock Bajo</p>
            <p className="text-sm">
              {product.name}: {product.stock} unidades
            </p>
          </div>
          <button
            onClick={() => dismiss(product.id)}
            className="flex-shrink-0 hover:bg-red-600 rounded p-1"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}