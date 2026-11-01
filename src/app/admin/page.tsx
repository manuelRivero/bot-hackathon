import { listOrders } from "@/lib/db/orders";
import { AdminOrdersTable } from "@/components/admin/AdminOrdersTable";

export default async function AdminPage() {
  const orders = await listOrders();

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 px-4 py-10 dark:bg-black">
      <div className="w-full max-w-5xl">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">Pedidos</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Pedidos realizados a través del bot.
        </p>

        <div className="mt-6">
          <AdminOrdersTable initialOrders={orders} />
        </div>
      </div>
    </div>
  );
}
