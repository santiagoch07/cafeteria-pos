export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8">
      <h1 className="text-4xl font-bold text-gray-800">Cafetería POS</h1>
      <p className="text-gray-500 text-lg">Sistema de punto de venta</p>
      <a
        href="/pos"
        className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-8 py-4 rounded-xl text-xl min-h-[60px] flex items-center transition-colors"
      >
        Abrir caja
      </a>
    </div>
  );
}
