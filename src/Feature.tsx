import { useMemo, useState } from "react";
import {
  MeshNameInput,
  useNamedPeer,
  usePerPeerValue,
  type MeshConfig,
  type YRoom,
} from "@baditaflorin/mesh-common";
type Props = { room: YRoom | null; config: MeshConfig };
export type RecipeStep = { text: string; submittedAt: number };
export function isValidStep(value: unknown): value is RecipeStep {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as Record<string, unknown>).text === "string" &&
    ((value as Record<string, unknown>).text as string).trim().length > 2 &&
    ((value as Record<string, unknown>).text as string).length <= 220 &&
    typeof (value as Record<string, unknown>).submittedAt === "number" &&
    Number.isFinite((value as Record<string, unknown>).submittedAt)
  );
}
export function Feature({ room, config }: Props) {
  const named = useNamedPeer(config, room);
  const steps = usePerPeerValue<RecipeStep | null>(room, "mesh-recipe-relay:steps", null);
  const [draft, setDraft] = useState("");
  const [copied, setCopied] = useState(false);
  const entries = useMemo(
    () =>
      steps.entries
        .filter((entry): entry is [string, RecipeStep] => isValidStep(entry[1]))
        .sort((a, b) => a[1].submittedAt - b[1].submittedAt || a[0].localeCompare(b[0])),
    [steps.entries],
  );
  const peerIds = useMemo(
    () =>
      Array.from(new Set([...Object.keys(named.names), room?.peerId ?? ""]))
        .filter(Boolean)
        .sort(),
    [named.names, room?.peerId],
  );
  const nextId = peerIds.length ? peerIds[entries.length % peerIds.length] : room?.peerId;
  const mine = isValidStep(steps.my) ? steps.my : null;
  const myTurn = Boolean(room && nextId === room.peerId && !mine);
  const recipeText = entries.map(([, step], i) => `${i + 1}. ${step.text}`).join("\n");
  const share = async () => {
    try {
      await navigator.clipboard.writeText(`Mesh Recipe Relay\n\n${recipeText}`);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <main className="relay-page">
      <header>
        <p className="eyebrow">Mesh recipe relay</p>
        <h1>Pass the spoon. Build dinner together.</h1>
        <p className="intro">
          One peer adds one clear instruction, then the turn moves on in deterministic order.
        </p>
        <p role="status">
          {room
            ? `Connected with ${room.peerCount} peer${room.peerCount === 1 ? "" : "s"}`
            : "Connecting to the kitchen…"}
        </p>
      </header>
      <section className="relay-grid">
        <section className="card compose">
          <p className="eyebrow">Your turn</p>
          <MeshNameInput
            label="Your name"
            value={named.name}
            onChange={named.setName}
            placeholder="Cook name"
            maxLength={32}
          />
          {mine ? (
            <>
              <blockquote>{mine.text}</blockquote>
              <p role="status">
                Your step is locked in. It cannot be duplicated or silently overwritten.
              </p>
            </>
          ) : (
            <>
              <label htmlFor="step">Instruction</label>
              <textarea
                id="step"
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, 220))}
                maxLength={220}
                rows={5}
                placeholder="For example: Toast the cumin until fragrant."
              />
              <button
                type="button"
                className="primary"
                onClick={() =>
                  myTurn && steps.setMy({ text: draft.trim(), submittedAt: Date.now() })
                }
                disabled={!myTurn || draft.trim().length < 3}
              >
                Add my one step
              </button>
              <p role="status">
                {myTurn
                  ? "It is your turn. Add one safe, concrete step."
                  : "Waiting for the next cook in the shared turn order."}
              </p>
            </>
          )}
        </section>
        <section className="card recipe" aria-labelledby="recipe-heading">
          <p className="eyebrow">Text-first recipe card</p>
          <h2 id="recipe-heading">
            {entries.length} step{entries.length === 1 ? "" : "s"} so far
          </h2>
          {entries.length ? (
            <ol>
              {entries.map(([id, step], i) => (
                <li key={id}>
                  <span>{i + 1}</span>
                  <p>
                    {step.text}
                    <small>{named.nameOf(id) || `Cook ${id.slice(0, 5)}`}</small>
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="empty">The first cook starts the recipe.</p>
          )}
          <button type="button" className="copy" onClick={share} disabled={!entries.length}>
            {copied ? "Copied recipe ✓" : "Copy recipe"}
          </button>
        </section>
      </section>
    </main>
  );
}
