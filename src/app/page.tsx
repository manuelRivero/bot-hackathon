import { getBusinessInfo } from "@/lib/db/business";
import { HomeClient } from "@/components/HomeClient";

export default async function Home() {
  const business = await getBusinessInfo();

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 dark:bg-black">
      <header className="w-full max-w-5xl px-4 pt-10 pb-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
          {business.cuisineType}
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-black dark:text-zinc-50">
          {business.name}
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{business.description}</p>
      </header>

      <HomeClient business={business} />
    </div>
  );
}
