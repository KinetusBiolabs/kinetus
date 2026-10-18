import { PACKAGING } from "@/lib/site";
import styles from "./admin.module.css";

/**
 * The content rule for product copy, above the description fields so it survives handoff,
 * folded behind "Copy guidelines" (closed by default) so it does not crowd the form. The
 * wording is the approved rule; do not soften or shorten it.
 */
export function ContentRule() {
  return (
    <details className={styles.rule}>
      <summary style={{ cursor: "pointer" }}>
        <strong>Copy guidelines</strong>
      </summary>
      <div style={{ marginTop: 8 }}>
        <p>
          <strong>Product descriptions describe the material, never its effect.</strong>
        </p>
        <p>
          <strong>Permitted:</strong> what the material is, its form, appearance, storage
          conditions, CAS number, molecular formula and weight, batch reference, what documentation
          is available, handling in laboratory terms.
        </p>
        <p>
          <strong>Not permitted:</strong> mechanism of action, what a material does in an organism,
          benefits, outcomes, research applications framed as effects, dosing, administration,
          reconstitution, preparation, or any variation of &ldquo;supports&rdquo;,
          &ldquo;enhances&rdquo;, &ldquo;improves&rdquo; or &ldquo;promotes&rdquo; applied to a
          biological process. Removing dosage figures from such copy does not make the rest of it
          permitted.
        </p>
        <p>
          <strong>Also never:</strong> purity percentages, potency claims, GMP or compliance claims,
          certifications, star ratings, review counts, testimonials.
        </p>
        <p>These strings from the packaging may be used exactly as written:</p>
        <ul className={styles.stringList}>
          {Object.values(PACKAGING).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    </details>
  );
}
