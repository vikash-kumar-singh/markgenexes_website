import { useEffect, useMemo, useState } from "react";
import { ImageOff, Loader2 } from "lucide-react";
import { getPublicCaseStudies } from "../lib/api";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

export function CaseStudiesPage() {
  const [items, setItems] = useState([]),
    [filter, setFilter] = useState("All"),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    getPublicCaseStudies()
      .then((data) => active && setItems(data))
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);
  const industries = useMemo(
    () => ["All", ...new Set(items.map((x) => x.industry).filter(Boolean))],
    [items],
  );
  const visible =
    filter === "All" ? items : items.filter((x) => x.industry === filter);
  return (
    <>
      <section className="premium-dark-surface relative overflow-hidden text-white">
        <img src="/logo-markgenexes.svg" alt="" className="pointer-events-none absolute -right-16 top-1/2 hidden size-80 -translate-y-1/2 rotate-6 opacity-10 md:block" />
        <div className="relative mx-auto max-w-[1440px] px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-violet-200">
            Case Studies & Portfolio
          </p>
          <h1 className="mt-5 text-4xl font-extrabold tracking-[-0.04em] sm:text-5xl lg:text-[3.4rem]">
            Proof, not promises.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-200 sm:text-xl">
            Real outcomes for real clients. Explore the work we are proudest
            of—with the numbers to back it up.
          </p>
        </div>
      </section>
      <main className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-8 lg:py-20">
        {loading ? (
          <div className="grid place-items-center py-20">
            <Loader2 className="size-7 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-red-700">
            {error}
          </div>
        ) : !items.length ? (
          <div className="surface-card grid place-items-center rounded-2xl py-20 text-center">
            <ImageOff className="size-8 text-muted-foreground" />
            <h2 className="mt-3 text-xl font-bold text-ink">
              Case studies coming soon
            </h2>
          </div>
        ) : (
          <>
            <div className="flex gap-2 overflow-x-auto border-b border-slate-200 pb-4">
              {industries.map((industry) => (
                <Button
                  key={industry}
                  variant={filter === industry ? "default" : "outline"}
                  className="shrink-0 rounded-full"
                  onClick={() => setFilter(industry)}
                >
                  {industry}
                </Button>
              ))}
            </div>
            <div className="mt-8 grid gap-5 lg:grid-cols-2">
              {visible.map((item) => (
                <article
                  key={item.id}
                  className="surface-card interactive-card group overflow-hidden rounded-2xl"
                >
                  <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                    <img
                      src={item.bannerImage}
                      alt={item.title}
                      className="size-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                  <Badge className="absolute left-4 top-4 border-0 bg-ink/85 text-white">
                      {item.industry}
                    </Badge>
                  </div>
                  <div className="p-5 sm:p-7">
                    <p className="text-sm font-black uppercase tracking-wide text-primary">
                      {item.clientName}
                    </p>
                    <h2 className="mt-3 text-2xl font-black leading-tight text-ink">
                      {item.title}
                    </h2>
                    <div className="mt-5 grid grid-cols-3 gap-2 border-y border-border py-5">
                      {item.metrics.map((metric, index) => (
                        <div key={index} className="border-r border-slate-200 px-1 text-center last:border-r-0">
                          <p className="text-xl font-black text-violet-600 sm:text-2xl">
                            {metric.value}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                            {metric.label}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 flex flex-wrap gap-2">
                      {item.services.map((service) => (
                        <Badge key={service}>{service}</Badge>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </main>
    </>
  );
}
