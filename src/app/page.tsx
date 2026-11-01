import { getBusinessInfo } from "@/lib/db/business";
import { HomeClient } from "@/components/HomeClient";

export default async function Home() {
  const business = await getBusinessInfo();

  return (
    <div className="flex flex-1 flex-col items-center bg-zinc-50 dark:bg-black">
      <header className="w-full bg-[url('/banner-hackathon.jpeg')] bg-cover bg-center px-4 pt-10 pb-6 text-center">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
            {business.cuisineType}
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-black">{business.name}</h1>
          <p className="mt-2 text-sm text-zinc-600">{business.description}</p>
        </div>
      </header>

      <HomeClient business={business} />
    </div>
  );
}
