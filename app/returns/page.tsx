import { getSiteContent } from "@/lib/site-content-server";
import { paragraphs } from "@/lib/site-content";

// "Bold label: description" → label in bold, as on the original page.
function Step({ text, index }: { text: string; index: number }) {
  const colon = text.indexOf(":");
  if (colon > 0 && colon < 60) {
    return (
      <li>
        <strong>
          {index + 1}. {text.slice(0, colon)}:
        </strong>
        {text.slice(colon + 1)}
      </li>
    );
  }
  return (
    <li>
      <strong>{index + 1}.</strong> {text}
    </li>
  );
}

export default async function ReturnsPage() {
  const { "returns.page": c } = await getSiteContent(["returns.page"]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">{c.title}</h1>
      <div className="prose max-w-none">
        {(c.returnText || c.requirements.length > 0) && (
          <section className="mb-8">
            {c.returnHeading && <h2 className="text-2xl font-semibold mb-4">{c.returnHeading}</h2>}
            {paragraphs(c.returnText).map((p, i) => (
              <p key={i} className="mb-4">{p}</p>
            ))}
            {c.requirements.length > 0 && (
              <div className="bg-muted p-6 rounded-lg mb-6">
                {c.requirementsHeading && <h3 className="text-xl font-semibold mb-3">{c.requirementsHeading}</h3>}
                <ul className="space-y-2">
                  {c.requirements.map((item: string, i: number) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {c.refundSteps.length > 0 && (
          <section className="mb-8">
            {c.refundHeading && <h2 className="text-2xl font-semibold mb-4">{c.refundHeading}</h2>}
            <ol className="space-y-4">
              {c.refundSteps.map((step: string, i: number) => (
                <Step key={i} text={step} index={i} />
              ))}
            </ol>
          </section>
        )}

        {c.exchangeText && (
          <section className="mb-8">
            {c.exchangeHeading && <h2 className="text-2xl font-semibold mb-4">{c.exchangeHeading}</h2>}
            {paragraphs(c.exchangeText).map((p, i) => (
              <p key={i} className="mb-4">{p}</p>
            ))}
          </section>
        )}

        {c.damagedText && (
          <section>
            {c.damagedHeading && <h2 className="text-2xl font-semibold mb-4">{c.damagedHeading}</h2>}
            {paragraphs(c.damagedText).map((p, i) => (
              <p key={i} className="mb-4">{p}</p>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
