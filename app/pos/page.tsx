export default function PosPage() {
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Panel de productos */}
      <div className="flex-1 p-4 overflow-auto">
        <h2 className="text-2xl font-bold text-gray-700 mb-4">Productos</h2>
        <p className="text-gray-400">Cargando productos…</p>
      </div>

      {/* Panel de orden */}
      <div className="w-80 bg-white shadow-xl flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-2xl font-bold text-gray-700">Orden</h2>
        </div>
        <div className="flex-1 p-4 overflow-auto">
          <p className="text-gray-400 text-center mt-8">Sin productos</p>
        </div>
        <div className="p-4 border-t space-y-3">
          <div className="flex justify-between text-xl font-bold">
            <span>Total</span>
            <span>$0.00</span>
          </div>
          <button className="w-full bg-green-500 hover:bg-green-600 text-white font-bold text-xl rounded-xl min-h-[60px] transition-colors">
            Cobrar
          </button>
        </div>
      </div>
    </div>
  );
}
