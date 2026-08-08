import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/credits")({
  head: () => ({
    meta: [
      { title: "Credits — Flared" },
      {
        name: "description",
        content: "The people behind Flared: development, design, and playtesters.",
      },
      { property: "og:title", content: "Credits — Flared" },
      { property: "og:description", content: "The people behind Flared." },
    ],
  }),
  component: Credits,
});

function Credits() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="panel p-6 sm:p-10">
        <h1 className="mb-8 font-display text-3xl font-black">
          <span className="text-shine">Credits</span>
        </h1>

        <div className="space-y-6 text-base leading-relaxed">
          <p>
            Julian for lead development and design
            <br />
            <a
              href="https://halo.rip/000"
              target="_blank"
              rel="noreferrer noopener"
              className="text-primary underline-offset-4 hover:underline"
            >
              https:halo.rip/000
            </a>
          </p>

          <p>Christian for being sick to his stomach</p>

          <p>and our lovely playtesters</p>

          <ul className="space-y-1">
            {["Zamba", "WeenieOkL", "Christian", "GamerRock", "TyonTyso"].map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>

          <p>and more to come ciao! &lt;3</p>
        </div>
      </div>
    </div>
  );
}
