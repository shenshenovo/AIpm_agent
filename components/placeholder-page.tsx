import { TopNav } from "@/components/top-nav";

type PlaceholderPageProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PlaceholderPage({
  eyebrow,
  title,
  description
}: PlaceholderPageProps) {
  return (
    <div className="min-h-screen bg-white">
      <TopNav />
      <main className="mx-auto flex min-h-screen max-w-6xl items-center px-6 pb-20 pt-[152px] lg:px-10">
        <section className="max-w-3xl">
          <p className="text-sm uppercase tracking-[0.3em] text-muted">{eyebrow}</p>
          <h1 className="mt-6 text-4xl font-semibold text-ink lg:text-5xl">{title}</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">{description}</p>
        </section>
      </main>
    </div>
  );
}
